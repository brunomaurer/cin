import { WidgetTypeEnum } from "./enums.js";

export type WidgetFieldType = typeof WidgetTypeEnum[keyof typeof WidgetTypeEnum];

export function getWidgetValueColumn(fieldType: WidgetFieldType): string {
  switch (fieldType) {
    case WidgetTypeEnum.Text:
    case WidgetTypeEnum.CollapsibleList:
    case WidgetTypeEnum.TextWithSubtitles:
    case WidgetTypeEnum.References:
      return "TextValue";
    case WidgetTypeEnum.Numeric:
    case WidgetTypeEnum.DropdownList:
      return "IntValue";
    case WidgetTypeEnum.Date:
      return "DateValue";
    case WidgetTypeEnum.MultipleSelectionDropdownList:
    case WidgetTypeEnum.User:
    case WidgetTypeEnum.File:
    case WidgetTypeEnum.Image:
      return "IntValue";
    default:
      return "TextValue";
  }
}

export function isArrayWidget(fieldType: WidgetFieldType): boolean {
  const arrayWidgetTypes: WidgetFieldType[] = [
    WidgetTypeEnum.MultipleSelectionDropdownList,
    WidgetTypeEnum.User,
    WidgetTypeEnum.File,
    WidgetTypeEnum.Image,
  ];
  return arrayWidgetTypes.includes(fieldType);
}

export function getWidgetTypeName(fieldType: WidgetFieldType): string {
  const entry = Object.entries(WidgetTypeEnum).find(([, v]) => v === fieldType);
  return entry ? entry[0] : `Unknown(${fieldType})`;
}
