import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { UntypedFormBuilder } from '@angular/forms';
import { PlatformLocation } from '@angular/common';
import { TwoFactorDialog } from './login-2FA';
import { inject } from '@angular/core/testing';

export interface TwoFactorData {
    twoFactor: string
}

export interface LoginData {
    host: string,
    username: string,
    text: string
}

@Component({
    selector: 'app-login',
    templateUrl: './login.html',
    styleUrls: ['./login.css']
})


export class LoginDialog implements OnInit {

    constructor(
        private _formBuilder: UntypedFormBuilder,
        private _router: Router,
        private _http: HttpClient,
        public dialog: MatDialog,
        public dialogRef: MatDialogRef<LoginDialog>,
        @Inject(MAT_DIALOG_DATA) public data: LoginData
    ) { }

    loading: boolean = false;

    // LOGIN FORM
    frmStepLogin = this._formBuilder.group({
        host: [''],
        username: [''],
        password: ['']
    });
    error_message = ''


    //// INIT ////
    ngOnInit(): void {
        this._http.get<any>("/api/login").subscribe({
            next: data => console.log(data),
            error: error => console.log(error)
        });
        this.frmStepLogin = this._formBuilder.group({
            host: [this.data.host.replace("manage", "api")],
            username: [this.data.username],
            password: ['']
        });
    }

    // RESET AUTHENTICATION FORM
    reset_response(): void {
        this.error_message = ''
    }

    // PARSE AUTHENTICATION RESPONSE FROM SERVER
    parse_response(data: any): void {
        this.loading = false;
        if ("error" in data) {
            this.error_message = data.error;
        } else if ("result" in data) {
            if (data.result == "two_factor_required") {
                this.open2FA()
            }
            else if (data.result == "success") {
                this.authenticated()
            } else this.error_message = "Unkown error"
        } else this.error_message = "Unkown error"

    }

    // WHEN AUTHENTICATION IS NOT OK
    parse_error(message: any): void {
        this.loading = false;
        console.log(message)
        this.error_message = message.error;
    }


    // WHEN AUTHENTICATION IS OK
    authenticated(): void {
        this.dialogRef.close(true);
    }

    cancel(): void {
        this.dialogRef.close();
    }

    exit(): void {
        this.dialogRef.close();
        this._router.navigate(["/"])
            .catch(console.error)
            .then(() => window.location.reload());
    }

    //// AUTHENTICATION ////
    submitCredentials(): void {
        this.reset_response();
        this.loading = true;
        this._http.post<any>('/api/login', { host: this.frmStepLogin.value.host, username: this.frmStepLogin.value.username, password: this.frmStepLogin.value.password }).subscribe({
            next: data => this.parse_response(data),
            error: error => this.parse_error(error.error)
        })
    }
    submit2FA(twoFactor: number): void {
        this.loading = true;
        this._http.post<any>('/api/login', { host: this.frmStepLogin.value.host, username: this.frmStepLogin.value.username, password: this.frmStepLogin.value.password, two_factor_code: twoFactor }).subscribe({
            next: data => this.parse_response(data),
            error: error => this.parse_error(error.error)
        })
    }

    //// DIALOG BOX ////
    open2FA(): void {
        const dialogRef = this.dialog.open(TwoFactorDialog, {});
        dialogRef.afterClosed().subscribe(result => {
            if (result) { this.submit2FA(result) }
        });
    }
}