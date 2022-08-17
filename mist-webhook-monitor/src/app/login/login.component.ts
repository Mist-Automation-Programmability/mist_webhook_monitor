import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { PlatformLocation } from '@angular/common';
import { TwoFactorDialog } from './../common/login-2FA';

export interface TwoFactorData {
  twoFactor: string;
}
export interface HostElement {
  value: string,
  viewValue: string
}


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})


export class LoginComponent implements OnInit {

  constructor(private _formBuilder: FormBuilder, private _http: HttpClient, private _router: Router, public _dialog: MatDialog, private _platformLocation: PlatformLocation
  ) { }

  github_url!: string;
  docker_url!: string;
  disclaimer!: string;
  host: string = "";
  loading: boolean = false;
  hosts_loading : boolean = true;
  hosts: HostElement[]  = [];

  // LOGIN FORM
  frmStepLogin = this._formBuilder.group({
    host: [''],
    username: [''],
    password: ['']
  });
  error_message = ''


  //// INIT ////
  ngOnInit(): void {
    this.frmStepLogin = this._formBuilder.group({
      host: ['api.mist.com'],
      username: [''],
      password: ['']
    });
    this._http.get<any>("/api/disclaimer").subscribe({
      next: data => {
        if (data.disclaimer) this.disclaimer = data.disclaimer;
        if (data.github_url) this.github_url = data.github_url;
        if (data.docker_url) this.docker_url = data.docker_url;
      }
    })
    this._http.get<HostElement[]>("/api/hosts").subscribe({
      next: data =>{ 
        this.hosts = data;
        this.hosts_loading = false;
      }
    })
  }

  //// COMMON ////
  check_host(): boolean {
    if (this.frmStepLogin.value.host != '') {
      return true;
    } else {
      return false;
    }
  }

  // RESET AUTHENTICATION FORM
  reset_response(): void {
    this.host = "";
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
    this.error_message = message.error;
  }


  // WHEN AUTHENTICATION IS OK
  authenticated(): void {
    this.loading = false;
    this._router.navigate(['/monitor']);
  }

  //// AUTHENTICATION ////
  submitCredentials(): void {
    this.reset_response();
    if (this.check_host()) {
      this.loading = true;
      this._http.post<any>('/api/login', { host: this.frmStepLogin.value.host, username: this.frmStepLogin.value.username, password: this.frmStepLogin.value.password }).subscribe({
        next: data => this.parse_response(data),
        error: error => {
          console.log(error)
          this.parse_error(error.error)
        }
      })
    }
  }
  submit2FA(twoFactor: number): void {
    if (this.check_host()) {
      this.loading = true;
      this._http.post<any>('/api/login', { host: this.frmStepLogin.value.host, username: this.frmStepLogin.value.username, password: this.frmStepLogin.value.password, two_factor_code: twoFactor }).subscribe({
        next: data => this.parse_response(data),
        error: error => this.parse_error(error.error)
      })
    }
  }

  //// DIALOG BOX ////
  open2FA(): void {
    const dialogRef = this._dialog.open(TwoFactorDialog, {});
    dialogRef.afterClosed().subscribe(result => {
      if (result) { this.submit2FA(result) }
    });
  }
}