import Link from "next/link";

interface NavTabItem {
  id: string;
  label: string;
  href: string;
}

export function NavTabs({ items }: { items: NavTabItem[] }) {
  return (
    <div
      className="flex border-b border-[#d9d9d9] overflow-x-auto"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {items.map((it) => (
        <Link
          key={it.id}
          href={it.href}
          className="py-2 mr-6 text-[1.125rem] text-[#666666] hover:text-[#1A1A1A] font-medium whitespace-nowrap shrink-0"
        >
          {it.label}
        </Link>
      ))}
    </div>
  );
}
