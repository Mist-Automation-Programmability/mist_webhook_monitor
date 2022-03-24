import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'bytessize' })

export class BytesPipe implements PipeTransform {
    transform(size: number = 0) {
        const multiplicator = ["B", "KB", "MB", "GB", "TB", "PB", "EB"]
        let m = 0;
        let result = "";
        while (size >= 1000) {
            size = size / 1000;
            m += 1;
        }
        result = size.toFixed(2) + " " + multiplicator[m];
        return result;
    }
}