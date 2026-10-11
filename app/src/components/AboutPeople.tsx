import { initials } from '../lib/about';
import type { AboutProps } from '../lib/about-assets';

type Person = AboutProps['people'][number];

export const EYEBROW_LABEL = 'text-[11px] font-semibold tracking-[0.14em] text-subtle uppercase';

const AvatarPhoto = ({ photo, position }: { photo: string; position: string }) => (
  <img
    src={photo}
    alt=""
    width={48}
    height={48}
    loading="lazy"
    style={{ objectPosition: position }}
    class="h-12 w-12 shrink-0 rounded-full border border-border-strong bg-surface-2 object-cover"
  />
);

const AvatarInitials = ({ name }: { name: string }) => (
  <span
    aria-hidden="true"
    class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border-strong bg-gradient-to-br from-amber-400/30 to-surface-2 text-sm font-semibold tracking-wide text-amber-900 dark:text-amber-50"
  >
    {initials(name)}
  </span>
);

const Avatar = ({ name, photo, position }: { name: string; photo?: string; position: string }) =>
  photo ? <AvatarPhoto photo={photo} position={position} /> : <AvatarInitials name={name} />;

const PersonRow = ({ person }: { person: Person }) => (
  <li class="flex items-center gap-3">
    <Avatar name={person.name} photo={person.photo} position={person.photoPosition} />
    <div>
      <div class="leading-snug font-semibold text-fg">{person.name}</div>
      <div class="text-sm leading-snug text-muted">{person.role}</div>
    </div>
  </li>
);

function PeopleSectionOrNothing({ people, heading }: { people: Person[]; heading: string }) {
  if (people.length === 0) return null;
  return (
    <section class="space-y-3">
      <h3 class={EYEBROW_LABEL}>{heading}</h3>
      <ul class="space-y-3">
        {people.map((p) => (
          <PersonRow key={p.name} person={p} />
        ))}
      </ul>
    </section>
  );
}

export function CreditsAndThanks({ ui, people }: Pick<AboutProps, 'ui' | 'people'>) {
  const inSection = (key: Person['section']) => people.filter((p) => p.section === key);
  return (
    <>
      <hr class="border-border" />
      <PeopleSectionOrNothing people={inSection('credits')} heading={ui.credits} />
      <PeopleSectionOrNothing people={inSection('thanks')} heading={ui.thanks} />
    </>
  );
}
