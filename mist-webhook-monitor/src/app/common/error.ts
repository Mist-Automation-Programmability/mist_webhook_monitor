import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface ErrorData {
    title: string,
    text: string,
    cancel: string,
    ok:string
}

@Component({
    selector: 'error',
    templateUrl: 'error.html',
})
export class ErrorDialog {
    cancel_button: string = "Cancel";
    ok_button: string = "Ok"
    constructor(
        public dialogRef: MatDialogRef<ErrorDialog>,
        @Inject(MAT_DIALOG_DATA) public data: ErrorData
    ) { }

        ngOnInit(){
            if (this.data.cancel!=undefined) this.cancel_button=this.data.cancel;
            if (this.data.ok!=undefined) this.ok_button=this.data.ok;
        }

    ok(): void {
        this.dialogRef.close(true);
    }
    cancel(): void {
        this.dialogRef.close(false)
    }

}