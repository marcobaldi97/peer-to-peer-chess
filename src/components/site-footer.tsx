import Avatar from 'components/avatar'
import marcoPhoto from 'assets/marco.jpeg'

function LinkedinIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5 flex-none text-accent-700"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

export default function SiteFooter() {
  return (
    <div className="mx-auto w-full max-w-[480px] px-4 pb-6">
      <a
        href="https://www.linkedin.com/in/marco-baldi-13805b1a1/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded border border-divider p-3 text-text no-underline"
      >
        <Avatar size="medium" src={marcoPhoto} alt="Marco Baldi" />
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-accent">
            Made by
          </span>
          <span className="font-heading text-base font-semibold">
            Marco Baldi
          </span>
        </div>
        <LinkedinIcon />
      </a>
    </div>
  )
}
