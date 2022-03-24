import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface ErrorData {
    title: string,
    text: string
}

@Component({
    selector: 'error',
    templateUrl: 'error.html',
})
export class ErrorDialog {
    constructor(
        public dialogRef: MatDialogRef<ErrorDialog>,
        @Inject(MAT_DIALOG_DATA) public data: ErrorData
    ) { }

    ok(): void {
        this.dialogRef.close(true);
    }
    cancel(): void {
        this.dialogRef.close(false)
    }

}