import {
  ExternalLink,
  LayoutGrid,
  GraduationCap,
  BookOpen,
  Phone,
  Mail,
  Calendar,
  Globe,
  FileText,
  Users,
  Building2,
  Megaphone,
  ShoppingBag,
  Newspaper,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

export const HEADER_LINK_ICONS: Record<string, LucideIcon> = {
  ExternalLink,
  LayoutGrid,
  GraduationCap,
  BookOpen,
  Phone,
  Mail,
  Calendar,
  Globe,
  FileText,
  Users,
  Building2,
  Megaphone,
  ShoppingBag,
  Newspaper,
  MessageCircle,
};

export const HEADER_LINK_ICON_NAMES = Object.keys(HEADER_LINK_ICONS);

export function getHeaderLinkIcon(name: string | null | undefined): LucideIcon {
  if (name && HEADER_LINK_ICONS[name]) return HEADER_LINK_ICONS[name];
  return ExternalLink;
}
