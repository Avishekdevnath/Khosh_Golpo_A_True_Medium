"use client";

import PeopleCard from "@/components/people/PeopleCard";
import type { PeopleExploreSection } from "@/types/people";

type ExploreSectionBlockProps = {
  title: string;
  subtitle: string;
  items: PeopleExploreSection["data"];
  onRelationshipChange: () => void | Promise<void>;
};

export default function ExploreSectionBlock({
  title,
  subtitle,
  items,
  onRelationshipChange,
}: ExploreSectionBlockProps) {
  if (items.length === 0) return null;

  return (
    <section className="grid gap-2.5">
      <div className="grid gap-0.5">
        <div className="text-[15px] font-bold text-[#d0d8f0]">{title}</div>
        <div className="text-xs text-[#4e5a78]">{subtitle}</div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-1.5 max-sm:grid-cols-1">
        {items.map((person) => (
          <PeopleCard key={person.id} person={person} onRelationshipChange={onRelationshipChange} />
        ))}
      </div>
    </section>
  );
}
