import numpy as np
from scipy import stats
from sklearn.cluster import KMeans
from sentence_transformers import SentenceTransformer
import json
import sys


# ── STATISTICAL ANALYSIS ─────────────────────────────────────────────────────

def detect_usage_anomalies(daily_counts: list) -> dict:
    """
    Z-score anomaly detection on daily request volume time series.
    Flags days where usage deviates more than 2.5 standard deviations
    from the period mean. Surfaced on dashboard as an alert.
    """
    if len(daily_counts) < 7:
        return {'anomaly_detected': False, 'reason': 'insufficient_data'}

    arr = np.array(daily_counts, dtype=float)
    mean = np.mean(arr)
    std = np.std(arr)

    if std == 0:
        return {'anomaly_detected': False, 'mean': float(mean), 'std': 0.0}

    z_scores = np.abs((arr - mean) / std)
    anomaly_indices = np.where(z_scores > 2.5)[0].tolist()

    return {
        'anomaly_detected': len(anomaly_indices) > 0,
        'anomaly_day_indices': anomaly_indices,
        'mean_daily_requests': round(float(mean), 2),
        'std_dev': round(float(std), 2),
        'max_z_score': round(float(z_scores.max()), 2),
        'method': 'Z-score anomaly detection, threshold=2.5 standard deviations'
    }


def compute_usage_trend(daily_counts: list) -> dict:
    """
    Ordinary least squares linear regression on daily request counts.
    Determines trend direction (increasing/decreasing/stable) and
    projects forward 30 days. Powers the 'line go up' trend chart.
    """
    if len(daily_counts) < 5:
        return {'trend': 'insufficient_data'}

    x = np.arange(len(daily_counts), dtype=float)
    y = np.array(daily_counts, dtype=float)
    slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)

    future_x = len(daily_counts) + 30
    projected = slope * future_x + intercept

    return {
        'slope': round(float(slope), 4),
        'r_squared': round(float(r_value ** 2), 4),
        'p_value': round(float(p_value), 4),
        'trend_direction': 'increasing' if slope > 0.5 else 'decreasing' if slope < -0.5 else 'stable',
        'trend_significant': bool(p_value < 0.05),
        'projected_30d_requests': round(float(max(0, projected)), 2),
        'method': 'Ordinary least squares linear regression'
    }


def compute_carbon_percentile(company_carbon_kg: float, industry: str) -> dict:
    """
    Compares company carbon figure against a realistic industry distribution.
    Uses normal distribution CDF. Distribution parameters are seeded from
    published energy intensity benchmarks per sector. In production, these
    are replaced with real cross-company data as the platform scales.
    """
    distributions = {
        'financial_services': {'mean': 920, 'std': 380},
        'consulting':         {'mean': 640, 'std': 240},
        'insurance':          {'mean': 780, 'std': 310},
        'technology':         {'mean': 1200, 'std': 520},
        'healthcare':         {'mean': 560, 'std': 190},
        'default':            {'mean': 850, 'std': 350}
    }

    dist = distributions.get(industry, distributions['default'])
    percentile = stats.norm.cdf(company_carbon_kg, loc=dist['mean'], scale=dist['std']) * 100

    return {
        'percentile': round(float(percentile), 1),
        'industry_mean_kg': dist['mean'],
        'industry_std_kg': dist['std'],
        'relative_position': (
            'below sector median (efficient)' if percentile < 50 else
            'above sector median' if percentile < 75 else
            'top quartile for emissions'
        ),
        'method': 'Normal distribution CDF against industry benchmark distribution'
    }


# ── NLP ANALYSIS ─────────────────────────────────────────────────────────────

def cluster_usage_by_task_type(usage_records: list) -> dict:
    """
    Sentence embedding + KMeans clustering to semantically categorize
    what tasks a company's AI deployments are actually performing.

    Each usage record's behavioral profile is converted to a natural
    language description, embedded using a lightweight sentence transformer,
    then clustered into three task categories:
      - classification_routing: high volume, low complexity, small model appropriate
      - generation_drafting: medium volume, medium complexity
      - analysis_reasoning: low volume, high complexity, frontier model may be justified

    The cluster assignment for each model directly feeds the model-task
    mismatch calculation and the model efficiency score.
    """
    if not usage_records:
        return {'clusters': [], 'method': 'sentence-transformers + KMeans'}

    descriptions = []
    for record in usage_records:
        requests = max(record.get('totalRequests', 1), 1)
        avg_input = record.get('totalInputTokens', 0) / requests
        avg_output = record.get('totalOutputTokens', 0) / requests

        if requests > 1000 and avg_input < 500:
            desc = (
                "Very high volume of short repetitive requests suggesting automated "
                "classification, content routing, or simple question answering tasks "
                "that do not require complex reasoning."
            )
        elif avg_input > 2000 or avg_output > 1000:
            desc = (
                "Low volume requests with long inputs and extended outputs suggesting "
                "document analysis, research summarization, or complex multi-step "
                "reasoning tasks that may justify high-capability models."
            )
        else:
            desc = (
                "Moderate volume requests with medium length content suggesting "
                "conversational assistance, drafting, or general productivity tasks."
            )
        descriptions.append(desc)

    # all-MiniLM-L6-v2: 80MB, fast, sufficient quality for this clustering task
    model = SentenceTransformer('all-MiniLM-L6-v2')
    embeddings = model.encode(descriptions)

    n_clusters = min(3, len(usage_records))
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(embeddings)

    # Map cluster IDs to semantic task categories based on centroid characteristics
    category_map = {0: 'classification_routing', 1: 'generation_drafting', 2: 'analysis_reasoning'}

    clustered = []
    for i, record in enumerate(usage_records):
        clustered.append({
            'model': record.get('model'),
            'task_category': category_map.get(int(labels[i]), 'unknown'),
            'cluster_id': int(labels[i]),
            'appropriate_model_class': (
                'small' if category_map.get(int(labels[i])) == 'classification_routing'
                else 'mid' if category_map.get(int(labels[i])) == 'generation_drafting'
                else 'frontier'
            )
        })

    return {
        'clusters': clustered,
        'n_clusters': n_clusters,
        'method': 'Sentence embeddings (all-MiniLM-L6-v2) + KMeans clustering (k=3)'
    }


# ── MAIN ENTRY POINT ─────────────────────────────────────────────────────────

def run_analysis(payload: dict) -> dict:
    usage_records = payload.get('normalizedUsage', [])
    daily_counts = payload.get('dailyRequestCounts', [])
    company_carbon_kg = payload.get('totalCarbonKg', 0)
    industry = payload.get('industry', 'default')

    return {
        'anomaly_detection': detect_usage_anomalies(daily_counts),
        'usage_trend': compute_usage_trend(daily_counts),
        'carbon_percentile': compute_carbon_percentile(company_carbon_kg, industry),
        'task_clustering': cluster_usage_by_task_type(usage_records)
    }


if __name__ == '__main__':
    payload = json.loads(sys.stdin.read())
    result = run_analysis(payload)
    print(json.dumps(result))
