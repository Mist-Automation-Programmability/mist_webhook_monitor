import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource, MatTable } from '@angular/material/table';

import { webSocket } from "rxjs/webSocket";
import { map, startWith } from "rxjs/operators";
import { Observable } from 'rxjs';

import { COMMA, ENTER, SPACE } from '@angular/cdk/keycodes';
import { FormControl, FormBuilder, FormGroup } from '@angular/forms';
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

export interface Filter {
  column: string,
  values: string[]
}

export const _filter = (opt: string[], value: string): string[] => {
  const filterValue = value.toLowerCase();
  return opt.filter(item => item.toLowerCase().includes(filterValue));
};

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

  filteringItems: string[] = [];
  possibleFilteringItems: Filter[] = [];
  filterForm: FormGroup = this._formBuilder.group({
    filterGroup: '',
  });
  filterOptions!: Observable<Filter[]>;

  /////////////////////////
  // table
  displayedColumns: string[] = ['date', 'type', 'org_name', 'site_name', 'device_name', 'device_mac', 'text', 'menu'];
  eventDataSource: any[] = [];
  filteredEventDataSource: MatTableDataSource<any> = new MatTableDataSource();
  pageIndex: number = 0
  pageSize: number = 25
  pageLength: number = 0
  pageSizeOptions: number[] = [5, 25, 50, 100]
  maxItems: number = 5000

  /////////////////////////
  // Websocket
  private session_id: string = "";
  private socket = webSocket('');
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
  org_names: any = {};
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
  @ViewChild(MatTable) table!: MatTable<any>;
  @ViewChild('filterInput') filterInput!: ElementRef<HTMLInputElement>;

  ///////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////// CONSTRUCTOR
  constructor(private _http: HttpClient, public _dialog: MatDialog, private _snackBar: MatSnackBar, private _router: Router, private _formBuilder: FormBuilder) { }

  ///////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////// INIT
  ngOnInit(): void {
    this.filterOptions = this.filterForm.get('filterGroup')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filterGroup(value)),
    );
    this.filteredEventDataSource.paginator = this.paginator;
    this.filteredEventDataSource.sort = this.sort;
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

  private _filterGroup(value: string): Filter[] {
    if (value) {
      return this.possibleFilteringItems
        .map(item => ({ column: item.column, values: _filter(item.values, value) }))
        .filter(item => item.values.length > 0);
    }

    return this.possibleFilteringItems;
  }
  //////////////////////////////////////////////////////////////////////////////
  /////           ORG
  //////////////////////////////////////////////////////////////////////////////
  parseOrgs(data: any): void {
    this.orgs = data;
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

  // SEND / RECEIVE FUNCTIONS
  socketSendReconnect(msg: any): void {
    this.openSnackBar("Websocket Connected!", "Dismiss")
    this.socket.next({ "action": "reconnect", "session_id": this.session_id })
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
    console.log(msg.webhook);
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
    webhook.events.forEach((event: any) => {
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
      this.eventDataSource.push(tmp);
      this.updatePossibleFilteringItems(event);
    })

    this.applyFilter();
  }

  // WEBSOCKET FUNCTIONS
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
      this.filteringItems.push(value);
    }

    // Clear the input value
    event.chipInput!.clear();
  }

  remove(item: string): void {
    const index = this.filteringItems.indexOf(item);

    if (index >= 0) {
      this.filteringItems.splice(index, 1);
    } 
    this.applyFilter();
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this.filteringItems.push(event.option.viewValue);
    this.filterInput.nativeElement.value = '';
    this.filterForm.get('filterGroup')!.setValue('');
    this.applyFilter();
  }

  //////////////////////////////////////////////////////////////////////////////
  /////           TABLE
  //////////////////////////////////////////////////////////////////////////////

  applyFilter() {
    this.possibleFilteringItems = [];
    console.log(this.filteringItems.length)
    if (this.filteringItems.length == 0) this.filteredEventDataSource.data = this.eventDataSource;
    else {
      var tmp: any[] = [];
      const fields_required = this.filteringItems.length;
      this.eventDataSource.forEach(event => {
        var fields_count = 0;
        this.displayedColumns.forEach(column => { if (this.filteringItems.includes(event[column])) fields_count += 1 })
        if (fields_count >= fields_required) tmp.push(event);

      })
      this.filteredEventDataSource.data = tmp;
    }

    this.table.renderRows();
    this.filteredEventDataSource.paginator = this.paginator;
    this.filteredEventDataSource.sort = this.sort;
    this.filteredEventDataSource.data.forEach(event => this.updatePossibleFilteringItems(event))
  }

  updatePossibleFilteringItems(event: any): void {
    this.displayedColumns.forEach(column => {
      if (column != "text" && event[column]) {
        var tmp = this.possibleFilteringItems.filter(item => item.column == column);
        if (tmp.length == 0) this.possibleFilteringItems.push({ "column": column, "values": [event[column]] })
        else if (!tmp[0].values.includes(event[column])) (tmp[0].values.push(event[column]))
      }
    })

    this.filterOptions = this.filterForm.get('filterGroup')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filterGroup(value)),
    );
  }

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
