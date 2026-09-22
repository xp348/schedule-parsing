class ScheduleError(Exception):
    """Ожидаемая ошибка получения расписания."""


class ScheduleDownloadError(ScheduleError):
    pass


class ScheduleTimeoutError(ScheduleDownloadError):
    pass


class ScheduleParseError(ScheduleError):
    pass


class ScheduleStorageError(ScheduleError):
    pass
