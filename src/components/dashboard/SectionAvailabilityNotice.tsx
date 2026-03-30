interface SectionAvailabilityNoticeProps {
  title: string
  message: string
}

export default function SectionAvailabilityNotice({
  title,
  message,
}: SectionAvailabilityNoticeProps) {
  return (
    <div className="rounded-[20px] border border-dashed border-[#dce9e2] bg-[#fbfcfb] p-8 text-center">
      <p className="font-medium text-[#152820]">{title}</p>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#7f8f88]">{message}</p>
    </div>
  )
}
