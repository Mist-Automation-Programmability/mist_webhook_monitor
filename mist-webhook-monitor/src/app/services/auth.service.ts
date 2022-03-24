import { Injectable } from '@angular/core';
import { connect } from 'http2';
import { Subject } from 'rxjs';


@Injectable({
    providedIn: 'root'
})
export class AuthConfigService {

    // Observable string sources
    private AuthConfigSource = new Subject<object>();

    // Observable string streams
    auth$ = this.AuthConfigSource.asObservable();

    constructor() { }

    // Service message commands
    setAuthConfig(auth_config: object) {
        this.AuthConfigSource.next(auth_config);
    }


}