import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'nextday' })

export class NextDayPipe implements PipeTransform {
    transform(account: any) {
        var now = new Date();
        if (account.last_rogue_process) {
            var date = new Date(account.last_rogue_process);
        } else {
            var date = new Date();
        }
        date.setUTCHours(account.sync_time_utc.hours);
        date.setUTCMinutes(account.sync_time_utc.minutes);
        if (date < now) {
            date.setDate(date.getDate() + 1);
        }
        return date;
    }
}