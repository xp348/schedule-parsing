from pydantic import BaseModel, Field


class ScheduleItem(BaseModel):
    sheet: str = Field(alias="Лист")
    day: str = Field(alias="День")
    time: str | int | float = Field(alias="Время")
    group: str | int | float = Field(alias="Группа")
    cell: str = Field(alias="Ячейка")
    content: str | int | float = Field(alias="Содержимое")
