export const WidgetTypeEnum = {
  Text: 5,
  Numeric: 10,
  Date: 25,
  File: 30,
  Image: 35,
  User: 40,
  DropdownList: 45,
  MultipleSelectionDropdownList: 46,
  CollapsibleList: 50,
  TextWithSubtitles: 70,
  References: 80,
  Picture: 110,
  ItemProfile: 115,
  Tags: 120,
  Rating: 140,
  Relation: 150,
  Folder: 160,
  Articles: 170,
  Address: 180,
} as const;

export const ContentStatusEnum = {
  Published: 10,
  Unpublished: 20,
  Deleted: 30,
  Draft: 40,
  Transferred: 50,
  Archived: 60,
} as const;

export const ResourceEnum = {
  Item: 10,
  Campaign: 20,
  ContentTypeManagement: 30,
  UserManagement: 40,
} as const;

export const ResourceAccessLevelEnum = {
  None: 0,
  View: 10,
  Write: 20,
  Delete: 30,
} as const;

export const CampaignStatusEnum = {
  Draft: 10,
  Active: 20,
  Completed: 30,
  Paused: 40,
  Closed: 50,
} as const;

export const CampaignTypeEnum = {
  Rating: 10,
  Interview: 20,
} as const;

export const SessionStatusEnum = {
  Active: 10,
  Submitted: 20,
  Abandoned: 30,
  Converted: 40,
} as const;

export const RoleTypeEnum = {
  System: 10,
  User: 20,
  Assistant: 30,
} as const;

export const SlotPriorityEnum = {
  MustCover: 10,
  NiceToHave: 20,
} as const;

export const RatingFieldType = {
  SingleOption: 10,
  MultipleOption: 20,
} as const;
