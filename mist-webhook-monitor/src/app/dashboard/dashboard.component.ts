import { Component, OnInit, ViewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

import { webSocket } from "rxjs/webSocket";
import { delay, tap, map, retryWhen, startWith } from "rxjs/operators";
import { Observable, TimeoutError, timer } from 'rxjs';

import { COMMA, ENTER, SPACE } from '@angular/cdk/keycodes';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';

import { ConfigDialog } from './config/config.component';


export interface Org {
  org_id: string;
  name: string;
}
export interface WsSettings {
  socket_path: string,
  session_id: string
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  ///////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////// DECALARATION
  /////////////////////////

  // table filter
  separatorKeysCodes: number[] = [ENTER, COMMA, SPACE];
  filterCtrl = new FormControl();
  filteredEvents: Observable<string[]>;
  items: string[] = [];
  allItems: string[] = [];

  /////////////////////////
  // table
  displayedColumns: string[] = ['date', 'type', 'org_name', 'site_name', 'device_name', 'device_mac', 'text'];
  eventDataSource: any[] = []
  itemsDisplayed: any[] = [];
  pageIndex: number = 0
  pageSize: number = 25
  pageLength: number = 0
  pageSizeOptions: number[] = [5, 25, 50, 100]
  maxItems: number = 5000

  /////////////////////////
  // Websocket
  private session_id: string = "";
  private socket = webSocket('');
  private socket_id: string = "";
  private socket_path: string = "";
  private socket_retry_count: number = 0;
  private socket_retry_inc_timeout: number = 5000;
  private socket_retry_max_timeout: number = 30000;
  socket_initialized: boolean = false;
  socket_connected: boolean = false;
  /////////////////////////
  // Others
  orgs: Org[] = [];
  orgs_activated: Org[] = [];
  org_names :any= {};
  is_working: boolean = false;
  error_mess: string = "";
  topics = {
    "device-events": false,
    "alarms": false,
    "audit": false,
    "device-updowns": false,
    "mxedge-events": false
  }
  box_opened: boolean = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  //@ViewChild('filterInput') filterInput: ElementRef<HTMLInputElement>;

  ///////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////// CONSTRUCTOR
  constructor(private _http: HttpClient, public _dialog: MatDialog, private _snackBar: MatSnackBar, private _router: Router) {
    this.filteredEvents = this.filterCtrl.valueChanges.pipe(
      startWith(null),
      map((item: string | null) => (item ? this._filter(item) : this.allItems.slice())),
    );
  }

  ///////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////// INIT
  ngOnInit(): void {
    this.getOrgs();
    this.getSocketSettings();
  }

  parseError(error: any): void {
    if (error.status == "401") this._router.navigate(["/"])
    else {
      var message: string = "Unable to contact the server... Please try again later... "
      if (error.error && error.error.message) message = error.error.message
      else if (error.error) message = error.error
      this.openSnackBar(message, "OK")
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  /////           ORG
  //////////////////////////////////////////////////////////////////////////////
  parseOrgs(data: any): void {
    this.orgs = data;
    console.log(this.orgs)
    this.orgs.forEach(org => {
      this.org_names[org.org_id] = org.name;
    })
  }
  getOrgs(): void {
    this._http.get<Org[]>("api/orgs").subscribe({
      next: data => this.parseOrgs(data),
      error: error => this.parseError(error)
    })
  }

  //////////////////////////////////////////////////////////////////////////////
  /////           WEBOSCKET
  //////////////////////////////////////////////////////////////////////////////
  socketSendReconnect(msg: any): void {
    this.openSnackBar("Websocket Connected!", "Dismiss")
    this.socket.next({ "action": "reconnect", "socket_id": this.socket_id, "session_id": this.session_id })
    this.socket_connected = true;
    this.socket_retry_count = 0
  }

  socketReceivedReconnect(msg: any): void {
    switch (msg.result) {
      case "success":
        const org_ids = msg.org_ids;
        const topics: string[] = msg.topics;
        this.orgs.forEach(org => {
          if (org_ids.includes(org.org_id)) this.orgs_activated.push(org)
        })
        topics.forEach(topic => {
          (this.topics as any)[topic] = true
        })
        break;
    }
  }

  socketSendPing(): void {
    this.socket.next({ "action": "ping" })
  }

  socketReceivedPong(msg: any): void {
    if (msg.socket_id) this.socket_id = msg.socket_id;
    if (msg.webhook) this.allItems.push(msg.webhook);
  }

  socketIsClosed(): void {
    this.socket_connected = false;
    this.socket_retry_count += 1;
    const timeout = Math.min(this.socket_retry_count * this.socket_retry_inc_timeout, this.socket_retry_max_timeout);
    this.openSnackBar("Websocket Disconnected! Retrying in " + timeout / 1000 + " sec.", "Dismiss")
    this.socketSubscibe(timeout)
  }

  socketIsInError(): void {
    this.socket_connected = false;
    this.socket_retry_count += 1;
    const timeout = Math.min(this.socket_retry_count * this.socket_retry_inc_timeout, this.socket_retry_max_timeout);
    this.openSnackBar("Unable to connect the Websocket! Retrying in " + timeout / 1000 + " sec.", "Dismiss")
    this.socketSubscibe(timeout)
  }

  socketReceivedWebhook(webhook: any) {
    console.log(webhook)
    webhook.events.forEach((event: any) => {
      var copiedEvents = this.eventDataSource.slice();
      var tmp: any = {
        topic: webhook.topic,
        raw_message: event
      };
      for (var key in event) {
        tmp[key] = event[key];
        if (key == "org_id") {
          tmp["org_name"] = this.org_names[event[key]];
        }
      }
      console.log(this.org_names)
      console.log(tmp)
      copiedEvents.push(tmp);
      this.eventDataSource = copiedEvents;
    })
  }

  socketSubscibe(timeout: number = 0): void {
    setTimeout(() => {
      this.socket = webSocket(this.socket_path)
      this.socket_initialized = true;
      this.socket.subscribe(
        msg => { // Called whenever there is a message from the server.}
          if (!this.socket_connected) this.socketSendReconnect(msg)
          if ((msg as any).action)
            switch ((msg as any).action) {
              case "ping":
                this.socketReceivedPong(msg);
                break;
              case "reconnect":
                this.socketReceivedReconnect(msg);
                break;
              case "webhook":
                this.socketReceivedWebhook((msg as any).webhook);
                break;
            }
        }, err => {// Called if at any point WebSocket API signals some kind of error.
          console.log(err);
          console.log(err.type);
          console.log(this.socket);
          if (this.socket_connected && err.type == "close") this.socketIsClosed();
          else if (!this.socket_connected && err.type == "error") this.socketIsInError();
        },
        () => { // Called when connection is closed (for whatever reason).
          console.log('complete')
          this.socket_connected = false;
          console.log(this.socket_connected)
        }
      );
      this.socketSendPing();
    }, timeout)
  }

  socketUnsubscribe(): void {
    this.socket.unsubscribe()
  }

  socketClose(): void {
    console.log("closed")
    this.socket.complete()
    this.socket_initialized = false;
  }

  getSocketSettings(): void {
    this._http.get<WsSettings>("api/ws").subscribe({
      next: data => {
        this.session_id = data.session_id;
        this.socket_path = data.socket_path;
        this.socketSubscibe();
      }, error: error => this.parseError(error)
    })
  }


  //////////////////////////////////////////////////////////////////////////////
  /////           FILTER
  //////////////////////////////////////////////////////////////////////////////
  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    // Add our item
    if (value) {
      this.items.push(value);
    }

    // Clear the input value
    event.chipInput!.clear();

    this.filterCtrl.setValue(null);
  }

  remove(item: string): void {
    const index = this.items.indexOf(item);

    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this.items.push(event.option.viewValue);
    //  this.filterInput.nativeElement.value = '';
    this.filterCtrl.setValue(null);
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.allItems.filter(item => item.toLowerCase().includes(filterValue));
  }

  //////////////////////////////////////////////////////////////////////////////
  /////           TABLE
  //////////////////////////////////////////////////////////////////////////////



  // apply_filter() {
  //   this.roguesDisplayed = [];
  //   this.stats.rogues.forEach(rogue => {
  //     const rogue_element = (rogue as RogueElement);
  //     if (
  //       (this.showInactive || rogue_element.first_seen > 0)
  //       && (
  //         (this.display.lan && rogue_element.rogue_type.lan)
  //         || (this.display.honeypot && rogue_element.rogue_type.honeypot)
  //         || (this.display.spoof && rogue_element.rogue_type.spoof)
  //         || (this.display.others && rogue_element.rogue_type.others)
  //       )
  //       && (this.filter_site == "" || rogue_element.site_name.toLocaleLowerCase().includes(this.filter_site.toLocaleLowerCase()))
  //       && (this.filter_ssid == "" || rogue_element.ssid.toLocaleLowerCase().includes(this.filter_ssid.toLocaleLowerCase()))
  //       && (this.filter_ap_mac == "" || rogue_element.ap_mac.toLocaleLowerCase().includes(this.filter_ap_mac.toLocaleLowerCase()))
  //       && (this.filter_bssid == "" || rogue_element.bssid.toLocaleLowerCase().includes(this.filter_bssid.toLocaleLowerCase()))
  //     )
  //       this.roguesDisplayed.push(rogue)
  //   })

  //   this.rogueDataSource = new MatTableDataSource<RogueElement>(this.roguesDisplayed)
  //   this.rogueDataSource.paginator = this.paginator;
  //   this.rogueDataSource.sort = this.sort;
  // }


  //////////////////////////////////////////////////////////////////////////////
  /////           DIALOG BOXES
  //////////////////////////////////////////////////////////////////////////////

  // CONFIG
  openConfig(): void {
    const dialogRef = this._dialog.open(ConfigDialog, {
      data: { orgs_list: this.orgs, orgs_activated: this.orgs_activated, topics: this.topics }
    });
    dialogRef.afterClosed().subscribe(result => {
      console.log(result)
      const message = { "action": "subscribe", "org_ids": result.org_ids, "topics": result.topics };
      this.socket.next(message);
    })
  }

  // SNACK BAR
  openSnackBar(message: string, action: string) {
    this._snackBar.open(message, action, {
      duration: 5000,
      horizontalPosition: "center",
      verticalPosition: "top",
    });
  }




  //////////////////////////////////////////////////////////////////////////////
  /////           BCK TO ORGS
  //////////////////////////////////////////////////////////////////////////////
  logout(): void {
    this._http.post<any>("/api/logout", { session_id: this.session_id })
  }
}
