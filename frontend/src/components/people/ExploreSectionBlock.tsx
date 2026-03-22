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
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="m-0 text-[15px] font-semibold text-foreground">{title}</h2>
        <p className="m-0 mt-0.5 text-[12.5px] text-foreground/50">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(person => (
          <PeopleCard key={person.id} person={person} onRelationshipChange={onRelationshipChange} />
        ))}
      </div>
    </section>
  );
}
