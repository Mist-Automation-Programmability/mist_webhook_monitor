import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-raw',
  templateUrl: './raw.component.html',
  styleUrls: ['./../dashboard.component.css']
})
export class RawDialog {
  constructor( @Inject(MAT_DIALOG_DATA) public data:  any) { }

}
