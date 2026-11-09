export function calculateAge(birthDate: string, today: Date = new Date()): number {
  const birth = new Date(`${birthDate}T00:00:00Z`);
  const years = today.getUTCFullYear() - birth.getUTCFullYear();
  const hasHadBirthdayThisYear =
    today.getUTCMonth() > birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() >= birth.getUTCDate());
  return hasHadBirthdayThisYear ? years : years - 1;
}
