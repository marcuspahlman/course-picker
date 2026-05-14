import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  courseOfferingValidator,
  programmeSyllabusContextValidator,
  requirementGroupValidator,
  studentSummaryValidator,
} from "./courseDataModel";

export default defineSchema({
  programmes: defineTable({
    programmeCode: v.string(),
    programmeName: v.string(),
    syllabusStart: v.string(),
    programmeSyllabusContext: programmeSyllabusContextValidator,
    programmeRules: v.array(v.string()),
  }).index("by_programmeCode", ["programmeCode"]),

  courses: defineTable({
    courseCode: v.string(),
    courseTitle: v.string(),
    canonicalSlug: v.string(),
    officialKthUrl: v.string(),
    source: v.optional(v.union(v.literal("canonical"), v.literal("community"))),
    courseType: v.optional(v.union(v.literal("kth"), v.literal("external"))),
    normalizedCourseCode: v.optional(v.string()),
    credits: v.optional(v.number()),
    period: v.optional(v.string()),
    link: v.optional(v.string()),
    institution: v.optional(v.string()),
    description: v.optional(v.string()),
    createdBy: v.optional(v.id("profiles")),
    createdAt: v.optional(v.number()),
    lastEditedBy: v.optional(v.id("profiles")),
    lastEditedAt: v.optional(v.number()),
  })
    .index("by_courseCode", ["courseCode"])
    .index("by_canonicalSlug", ["canonicalSlug"])
    .index("by_source", ["source"])
    .index("by_normalizedCourseCode", ["normalizedCourseCode"]),

  programmeCourses: defineTable({
    programmeId: v.id("programmes"),
    courseId: v.id("courses"),
    offerings: v.array(courseOfferingValidator),
    programmeNotes: v.optional(v.array(v.string())),
    requirementGroup: v.optional(requirementGroupValidator),
  })
    .index("by_programmeId", ["programmeId"])
    .index("by_courseId", ["courseId"])
    .index("by_programmeId_and_courseId", ["programmeId", "courseId"]),

  courseStudentSummaries: defineTable({
    courseId: v.id("courses"),
    reflectionCount: v.number(),
    studentSummary: studentSummaryValidator,
  }).index("by_courseId", ["courseId"]),

  profiles: defineTable({
    authUserId: v.string(),
    tokenIdentifier: v.string(),
    displayName: v.string(),
    imageUrl: v.optional(v.string()),
    defaultProgrammeCode: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_authUserId", ["authUserId"])
    .index("by_tokenIdentifier", ["tokenIdentifier"]),

  courseStatuses: defineTable({
    profileId: v.id("profiles"),
    courseId: v.id("courses"),
    status: v.union(
      v.literal("saved"),
      v.literal("taking"),
      v.literal("taken"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_profileId", ["profileId"])
    .index("by_profileId_and_courseId", ["profileId", "courseId"])
    .index("by_courseId", ["courseId"]),

  courseComments: defineTable({
    courseId: v.id("courses"),
    authorId: v.id("profiles"),
    body: v.string(),
    createdAt: v.number(),
  })
    .index("by_courseId_and_createdAt", ["courseId", "createdAt"])
    .index("by_courseId_and_authorId_and_createdAt", [
      "courseId",
      "authorId",
      "createdAt",
    ])
    .index("by_authorId", ["authorId"]),

  friendGroups: defineTable({
    name: v.string(),
    creatorProfileId: v.id("profiles"),
    inviteCode: v.string(),
    createdAt: v.number(),
  })
    .index("by_creatorProfileId", ["creatorProfileId"])
    .index("by_inviteCode", ["inviteCode"]),

  friendGroupMembers: defineTable({
    groupId: v.id("friendGroups"),
    profileId: v.id("profiles"),
    joinedAt: v.number(),
  })
    .index("by_groupId", ["groupId"])
    .index("by_profileId", ["profileId"])
    .index("by_groupId_and_profileId", ["groupId", "profileId"]),
});
