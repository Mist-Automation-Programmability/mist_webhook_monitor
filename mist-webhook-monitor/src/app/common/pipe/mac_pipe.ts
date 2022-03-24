import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'mac' })

export class MacPipe implements PipeTransform {
    transform(mac: string = "") {
        var result = [];
        for (let i =0; i <=5; i++){
            result.push(mac.substr(i*2, 2))
        }
        return result.join(":");
    }
}