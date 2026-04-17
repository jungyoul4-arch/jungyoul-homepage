export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getDb } from "@/db";
import { teachers as teachersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { toTeacher } from "@/lib/mappers";
import { ChevronRight } from "lucide-react";
import { AdminEditButton } from "@/components/admin-edit-button";
import { isValidThumbnail } from "@/lib/thumbnail";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const db = await getDb();
  const [raw] = await db
    .select()
    .from(teachersTable)
    .where(eq(teachersTable.slug, decodedSlug))
    .limit(1);

  if (!raw) return {};
  const teacher = toTeacher(raw);

  return {
    title: `${teacher.name} 선생님`,
    description: `정율사관학원 ${teacher.subject} 전문 강사 ${teacher.name} 선생님을 소개합니다.`,
    alternates: { canonical: `/teachers/${teacher.slug}` },
  };
}

export default async function TeacherPage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const db = await getDb();

  const [raw] = await db
    .select()
    .from(teachersTable)
    .where(eq(teachersTable.slug, decodedSlug))
    .limit(1);

  if (!raw) notFound();
  const teacher = toTeacher(raw);

  return (
    <div className="max-w-[1480px] mx-auto px-4 lg:px-10 py-10">
      <nav className="pb-6 text-[1rem] text-[#666666]" aria-label="breadcrumb">
        <ol className="flex items-center gap-1">
          <li>
            <Link href="/" className="hover:text-[#1E64FA] transition-colors">홈</Link>
          </li>
          <li><ChevronRight size={14} className="text-[#666666]" /></li>
          <li>
            <Link href="/teachers" className="hover:text-[#1E64FA] transition-colors">선생님 소개</Link>
          </li>
          <li><ChevronRight size={14} className="text-[#666666]" /></li>
          <li className="text-[#1A1A1A] font-bold">{teacher.name} 선생님</li>
        </ol>
      </nav>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="relative w-full md:w-60 aspect-square bg-gray-100 rounded-sm overflow-hidden shrink-0">
          {isValidThumbnail(teacher.photo) ? (
            <Image
              src={teacher.photo}
              alt={`${teacher.name} 선생님`}
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <span className="text-gray-400 text-5xl font-bold">{teacher.name[0]}</span>
            </div>
          )}
          <div className="absolute top-2 right-2">
            <AdminEditButton type="teacher" data={teacher} />
          </div>
        </div>

        <div>
          <span className="inline-block px-2.5 py-1 bg-blue-50 text-[#1E64FA] text-[1rem] font-bold rounded mb-3">
            {teacher.subject}
          </span>
          <h1 className="text-[1.5rem] md:text-[2.75rem] font-bold text-[#1A1A1A]">
            {teacher.name} 선생님
          </h1>
        </div>
      </div>
    </div>
  );
}
