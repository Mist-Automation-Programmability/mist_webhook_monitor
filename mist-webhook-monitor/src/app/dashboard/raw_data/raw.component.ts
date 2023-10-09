import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-raw',
  templateUrl: './raw.component.html',
  styleUrls: ['./../dashboard.component.scss', './raw.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class RawDialog {
  indent: number = 4;
  html_event: string = "";
  html_message: string = "";
  constructor(@Inject(MAT_DIALOG_DATA) public data: { raw_message: object, raw_event: object }) { }

  ngOnInit(): void {
    this.html_event = this.rawFormat(this.data.raw_event)
    this.html_message = this.rawFormat(this.data.raw_message)

  }

  rawFormat(data: any): string {
    if (Array.isArray(data)) return this.isArray("", 0, data, true);
    else return this.isObject("", 0, data, true);
  }

  isArray(key: string, inc: number, data: any[], is_last: boolean): string {
    var html = "<div>" + this.isKey(key, inc) + "[</div>"
    data.forEach((value, idx) => {
      var last = true;
      if (idx < data.length - 1) last = false;
      if (typeof (value) == "string") html += this.isString("", inc + 1, value, last);
      else if (typeof (value) == "number") html += this.isNumber("", inc + 1, value, last);
      else if (typeof (value) == "boolean") html += this.isBoolean("", inc + 1, value, last);
      else if (Array.isArray(value)) html += this.isArray("", inc + 1, value, last);
      else html += this.isObject("", inc + 1, value, last);
    })
    html += "<div>" + " ".repeat(inc * this.indent) + "]"
    if (!is_last) html += ","
    html += "</div>"
    return html;
  }
  isObject(key: string, inc: number, data: Object, is_last: boolean): string {
    var html = "<div>" + this.isKey(key, inc) + "{</div>"
    const length = Object.keys(data).length;
    var i = 0;
    for (const key in data) {
      i += 1;
      console.log(i, length)      
      var last = true;
      if (i < length  ) last = false;
      const value = (data as any)[key];
      if (typeof (value) == "string") html += this.isString(key, inc + 1, value, last);
      else if (typeof (value) == "number") html += this.isNumber(key, inc + 1, value, last);
      else if (typeof (value) == "boolean") html += this.isBoolean(key, inc + 1, value, last);
      else if (Array.isArray(value)) html += this.isArray(key, inc + 1, value, last);
      else html += this.isObject(key, inc + 1, value, last);
    }
    html += "<div>" + " ".repeat(inc * this.indent) + "}"
    if (!is_last) html += ","
    html += "</div>"
    return html
  }

  isString(key: string, inc: number, value: string, is_last: boolean): string {

    var html = "<div>" + this.isKey(key, inc) + "<span class='string'>\"" + value.replace(/"/gi, '\\"') + "\"</span>";
    if (!is_last) html += ","
    html += "</div>"
    return html
  }
  isNumber(key: string, inc: number, value: number, is_last: boolean): string {
    var html = "<div>" + this.isKey(key, inc) + "<span class='number'>" + value + "</span>";
    if (!is_last) html += ","
    html += "</div>"
    return html
  }
  isBoolean(key: string, inc: number, value: boolean, is_last: boolean): string {
    var html = "<div>" + this.isKey(key, inc) + "<span class='boolean'>" + value + "</span>";
    if (!is_last) html += ","
    html += "</div>"
    return html
  }
  isKey(key: string, inc: number = 0): string {
    if (key == "") return "<span class='key'>" + " ".repeat(inc * this.indent) + "</span>"
    else return "<span class='key'>" + " ".repeat(inc * this.indent) + "\"" + key + "\"</span><span>: </span>"
  }
}
