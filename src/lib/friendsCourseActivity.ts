import type { Id } from "../../convex/_generated/dataModel";

export type FriendCourseProfileChip = {
  profileId: string;
  displayName: string;
  imageUrl: string | null;
};

export type FriendsCourseActivityPayload = {
  profiles: Array<{
    profileId: Id<"profiles">;
    displayName: string;
    imageUrl: string | null;
  }>;
  courses: Array<{
    courseId: Id<"courses">;
    saved: Id<"profiles">[];
    taking: Id<"profiles">[];
    taken: Id<"profiles">[];
  }>;
};

export type FriendsOnCourse = {
  saved: FriendCourseProfileChip[];
  taking: FriendCourseProfileChip[];
  taken: FriendCourseProfileChip[];
};

export function friendPlanningScore(
  activity: FriendsOnCourse | undefined,
  reflectionCount = 0,
) {
  return (
    (activity?.saved.length ?? 0) * 1.2 +
    (activity?.taken.length ?? 0) +
    (activity?.taking.length ?? 0) * 2 +
    reflectionCount * 0.2
  );
}

function chipsForCourseRow(
  row: FriendsCourseActivityPayload["courses"][0],
  pmap: Map<string, FriendsCourseActivityPayload["profiles"][0]>,
): FriendsOnCourse {
  const toChip = (id: Id<"profiles">): FriendCourseProfileChip | null => {
    const p = pmap.get(id as string);
    if (!p) return null;
    return {
      profileId: id as string,
      displayName: p.displayName,
      imageUrl: p.imageUrl,
    };
  };

  return {
    saved: row.saved
      .map(toChip)
      .filter((c): c is FriendCourseProfileChip => c !== null),
    taking: row.taking
      .map(toChip)
      .filter((c): c is FriendCourseProfileChip => c !== null),
    taken: row.taken
      .map(toChip)
      .filter((c): c is FriendCourseProfileChip => c !== null),
  };
}

export function friendActivityByCourseId(
  data: FriendsCourseActivityPayload | undefined,
): Map<string, FriendsOnCourse> {
  const m = new Map<string, FriendsOnCourse>();
  if (!data) return m;

  const pmap = new Map(data.profiles.map((p) => [p.profileId as string, p]));

  for (const row of data.courses) {
    m.set(row.courseId as string, chipsForCourseRow(row, pmap));
  }

  return m;
}

export function friendsOnSingleCourseFromPayload(
  data: FriendsCourseActivityPayload | undefined,
): FriendsOnCourse | null {
  if (!data || data.courses.length === 0) return null;
  const pmap = new Map(data.profiles.map((p) => [p.profileId as string, p]));
  return chipsForCourseRow(data.courses[0], pmap);
}
