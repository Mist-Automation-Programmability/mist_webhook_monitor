import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'tsarray' })

export class TsArrayPipe implements PipeTransform {
    transform(tsArray: [{ ts:number, value:any}]) {
        var values: any[] = [];
        tsArray.forEach(item => {
            if (!values.includes(item.value)) values.push(item.value);
        })
        var result = values.join(", ");
        return result;
    }
}