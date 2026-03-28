import { spawn } from 'child_process'

export async function runStatAnalysis(payload: {
  normalizedUsage: any[]
  dailyRequestCounts: number[]
  totalCarbonKg: number
  industry: string
}): Promise<any> {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', ['src/analysis/pipeline.py'])
    let output = ''
    let errorOutput = ''

    python.stdin.write(JSON.stringify(payload))
    python.stdin.end()
    python.stdout.on('data', d => output += d.toString())
    python.stderr.on('data', d => errorOutput += d.toString())
    python.on('close', code => {
      if (code !== 0) {
        console.error('Stat analysis error:', errorOutput)
        // Don't fail the pipeline if stat analysis fails
        resolve({ error: 'stat_analysis_failed' })
        return
      }
      try { resolve(JSON.parse(output)) }
      catch { resolve({ error: 'parse_failed' }) }
    })
  })
}
