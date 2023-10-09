import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, Sort, MatSortable } from '@angular/material/sort';
import { MatTableDataSource, MatTable } from '@angular/material/table';

import { webSocket } from "rxjs/webSocket";
import { map, startWith } from "rxjs/operators";
import { Observable } from 'rxjs';

import { COMMA, ENTER, SPACE } from '@angular/cdk/keycodes';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';

import { ConfigDialog } from './config/config.component';
import { DiagramDialog } from './diagram/diagram.component';
import { RawDialog } from './raw_data/raw.component';
import { LoginDialog } from './../common/login';


export interface Org {
  org_id: string;
  name: string;
}
export interface WsSettings {
  socket_path: string,
  session_id: string,
  host: string,
  username: string
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
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  ///////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////// DECALARATION
  /////////////////////////

  // table filter
  separatorKeysCodes: number[] = [ENTER, COMMA, SPACE];
  filteringItems: string[] = [];
  possibleFilteringItems: Filter[] = [];
  filterForm: UntypedFormGroup = this._formBuilder.group({
    filterGroup: '',
  });
  filterOptions!: Observable<Filter[]>;
  /////////////////////////
  // table
  displayedColumns: string[] = ['timestamp', 'topic', 'type', 'org_name', 'site_name', 'device_name', 'mac', 'text', 'menu'];
  eventDataSource: any[] = [];
  filteredEventDataSource: MatTableDataSource<any>;
  pageIndex: number = 0;
  pageSize: number = 25;
  pageLength: number = 0;
  pageSizeOptions: number[] = [5, 25, 50, 100];
  maxItems: number = 10000;

  /////////////////////////
  // Websocket
  private session_id: string = "";
  private socket = webSocket('');
  private socket_path: string = "";
  private socket_retry_count: number = 0;
  private socket_retry_timeout: number = 5000;
  private socket_retry_max_retry: number = 60;
  private socket_ping: any;
  socket_initialized: boolean = false;
  socket_connected: boolean = false;
  socket_error: boolean = false;
  /////////////////////////
  // Search
  /////////////////////////
  // Others
  private login_opened: boolean = false;
  private diagram_opened: boolean = false;
  private config_opened: boolean = false;
  private config_initialized: boolean = false;
  private username: string = "";
  private host: string = "";
  private orgs: Org[] = [];
  private orgs_activated: Org[] = [];
  wehbook_configured: boolean = false;
  org_names: any = {};
  private topics = {
    "device-events": false,
    "alarms": false,
    "audits": false,
    "device-updowns": false,
    "mxedge-events": false
  }
  box_opened: boolean = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort: MatSort = new MatSort();
  @ViewChild(MatTable) table!: MatTable<any>;
  @ViewChild('filterInput') filterInput!: ElementRef<HTMLInputElement>;

  ///////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////// CONSTRUCTOR
  constructor(private _http: HttpClient, public _dialog: MatDialog, private _snackBar: MatSnackBar, private _router: Router, private _formBuilder: UntypedFormBuilder) {
    this.filteredEventDataSource = new MatTableDataSource();
  }

  ///////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////// INIT
  ngOnInit(): void {
    //this.filteredEventDataSource.paginator = this.paginator;

    this.filterOptions = this.filterForm.get('filterGroup')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filterGroup(value)),
    );
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

  // Reconnect
  socketSendReconnect(): void {
    this.socket.next({ "action": "reconnect", "session_id": this.session_id })
  }

  socketReceivedReconnect(msg: any): void {
    switch (msg.result) {
      case "success":
        this.socket_connected = true;
        this.socket_error = false;
        this.socket_retry_count = 0
        const org_ids = msg.org_ids;
        const topics: string[] = msg.topics;
        var tmp_orgs: Org[] = [];
        this.orgs.forEach(org => {
          if (org_ids.includes(org.org_id)) this.orgs_activated.push(org)
          else tmp_orgs.push(org)
        })
        this.orgs = tmp_orgs;

        topics.forEach(topic => {
          (this.topics as any)[topic] = true
        })
        if (!this.config_initialized && org_ids.length == 0 && topics.length == 0) this.openConfig();
        else this.wehbook_configured = true;
        break;
    }
  }

  // Subscribe
  socketSendSubscribe(): void {
    var org_ids: string[] = []
    var topics: string[] = [];
    this.orgs_activated.forEach(org => {
      org_ids.push(org.org_id)
    })
    for (var topic in this.topics) {
      if ((this.topics as any)[topic]) topics.push(topic)
    }
    const message = { "action": "subscribe", "org_ids": org_ids, "topics": topics };
    this.socket.next(message);
  }

  sockerReceivedSubscribe(msg: any): void {
    switch (msg.result) {
      case "success": var org_ids: string[] = []
        var topics: string[] = [];
        this.orgs_activated.forEach(org => {
          org_ids.push(org.org_id)
        })
        for (var topic in this.topics) {
          if ((this.topics as any)[topic]) topics.push(topic)
        }
        if (org_ids.length > 0 && topics.length > 0) this.wehbook_configured = true;
        else this.wehbook_configured = false;
    }
  }

  // Ping
  socketSendPing(): void {
    this.socket.next({ "action": "ping" })
  }

  socketReceivedPong(): void {
    this.socket_connected = true;
    if (this.socket_connected) this.socket_ping = setTimeout(() => {
      this.socketSendPing();
    }, 60000)
  }

  // Close
  socketIsClosed(err: any): void {
    console.log(err);
    this.socketClose();
    this.socket_retry_count += 1;

    var timeout = this.socket_retry_timeout;
    if (this.socket_retry_count > this.socket_retry_max_retry) timeout = 60000;
    this.socketSubscibe(timeout)
  }

  // Error
  socketIsInError(err: any): void {
    console.log(err);
    this.socketClose();
    this.socket_retry_count += 1;
    if (this.socket_retry_count >= this.socket_retry_max_retry) this.socket_error = true;

    var timeout = this.socket_retry_timeout;
    if (this.socket_retry_count > this.socket_retry_max_retry) timeout = 60000;
    this.socketSubscibe(timeout)
  }


  addNewEventInList(new_event: any): void {
    new_event._new = true;
    this.eventDataSource.push(new_event);
    while (this.eventDataSource.length > this.maxItems) this.eventDataSource.shift();
    this.updatePossibleFilteringItems(new_event);
    setTimeout(() => {
      new_event._new = false;
    }, 1000)
  }

  processDeviceEvents(webhook_message: any) {
    webhook_message.events.forEach((event: any) => {
      var tmp: any = {
        topic: webhook_message.topic,
        raw_message: webhook_message,
        raw_event: event
      };
      for (var key in event) {
        tmp[key] = event[key];
        if (key == "org_id") {
          tmp["org_name"] = this.org_names[event[key]];
        }
      }
      this.addNewEventInList(tmp);
    })
  }

  processDefault(webhook_message: any): void {
    webhook_message.events.forEach((event: any) => {
      var tmp: any = {
        topic: webhook_message.topic,
        raw_message: webhook_message,
        raw_event: event
      };
      for (var key in event) {
        tmp[key] = event[key];
        if (key == "org_id") {
          tmp["org_name"] = this.org_names[event[key]];
        }
      }
      this.addNewEventInList(tmp);
    })
  }
  processAudits(webhook_message: any): void {
    webhook_message.events.forEach((event: any) => {
      var tmp: any = {
        topic: webhook_message.topic,
        raw_message: webhook_message,
        raw_event: event
      };
      for (var key in event) {
        if (key == "message") tmp["text"] = event[key];
        else {
          tmp[key] = event[key];
          if (key == "org_id") {
            tmp["org_name"] = this.org_names[event[key]];
          }
        }
      }
      this.addNewEventInList(tmp);
    })
  }

  processAlarmsInfra(event: any, webhook_message: any): void {
    var tmp: any = {
      topic: webhook_message.topic,
      raw_message: webhook_message,
      raw_event: event
    };
    for (var key in event) {
      switch (key) {
        case "aps":
          tmp["mac"] = event[key];
          tmp["device_type"] = "ap";
          break;
        case "switches":
          tmp["mac"] = event[key];
          tmp["device_type"] = "switch";
          break;
        case "gateways":
          tmp["mac"] = event[key];
          tmp["device_type"] = "gateway";
          break;
        case "hostnames":
          tmp["device_name"] = event[key];
          break;
        case "reasons":
        case "reason":
          tmp["text"] = event[key];
          break;
        default:
          tmp[key] = event[key];
          if (key == "org_id") {
            tmp["org_name"] = this.org_names[event[key]];
          }
          break;
      }
    }
    this.addNewEventInList(tmp);
  }

  processAlarmsMarvis(event: any, webhook_message: any): void {
    var tmp: any = {
      topic: webhook_message.topic,
      raw_message: webhook_message,
      raw_event: event
    };
    for (var key in event) {
      switch (key) {
        case "email_content":
          for (var email_key in event[key]) {
            switch (email_key) {
              case "impacted_aps":
                tmp["device_name"] = event[key][email_key];
                tmp["device_type"] = "ap";
                break;
              case "impacted_switches":
                tmp["device_name"] = event[key][email_key];
                tmp["device_type"] = "switch";
                break;
              case "impacted_gateways":
                tmp["device_name"] = event[key][email_key];
                tmp["device_type"] = "gateway";
                break;
            }

          }
          break;
        case "details":
          tmp["text"] = event[key]?.symptom;
          break;
        default:
          tmp[key] = event[key];
          if (key == "org_id") {
            tmp["org_name"] = this.org_names[event[key]];
          }
          break;
      }
    }
    this.addNewEventInList(tmp);
  }

  processAlarms(webhook_message: any): void {
    webhook_message.events.forEach((event: any) => {
      switch (event.group) {
        case "infrastructure":
          this.processAlarmsInfra(event, webhook_message);
          break;
        case "marvis":
          this.processAlarmsMarvis(event, webhook_message);
          break;
        default:
          this.processDefault(webhook_message);
          break;
      }

    })
  }

  socketReceivedWebhook(webhook_message: any) {
    var init = false;
    if (this.eventDataSource.length == 0) init = true
    switch (webhook_message.topic) {
      case "alarms":
        this.processAlarms(webhook_message);
        break;
      case "audits":
        this.processAudits(webhook_message);
        break;
      default:
        this.processDefault(webhook_message);
        break;
    }
    this.applyFilter(init);
  }

  socketReceiveError(webhook_message: any) {
    switch (webhook_message.code) {
      case 401:
        this.socket.complete();
        this.session_id = "";
        if (!this.login_opened) this.openLogIn();
        break;
    }
  }

  // WEBSOCKET FUNCTIONS
  socketSubscibe(timeout: number = 0): void {
    setTimeout(() => {
      this.socket = webSocket(this.socket_path);
      this.socket_initialized = true;
      this.socket.subscribe(
        msg => { // Called whenever there is a message from the server.}
          if (!this.socket_connected) this.socketSendReconnect();
          if (this.wehbook_configured) this.socketSendSubscribe();;
          if ((msg as any).action)
            switch ((msg as any).action) {
              case "error":
                this.socketReceiveError(msg);
                break;
              case "ping":
                this.socketReceivedPong();
                break;
              case "reconnect":
                this.socketReceivedReconnect(msg);
                break;
              case "webhook":
                this.socketReceivedWebhook((msg as any).webhook);
                break;
              case "subscribe":
                this.sockerReceivedSubscribe((msg as any));
                break;
            }
        }, err => {// Called if at any point WebSocket API signals some kind of error.
          if (this.socket_connected && err.type == "close") this.socketIsClosed(err);
          else if (!this.socket_connected && err.type == "error") this.socketIsInError(err);
        },
        () => { // Called when connection is closed (for whatever reason).
          this.socket_connected = false;
        }
      );
      this.socketSendPing();

    }, timeout)
  }

  socketForceRetry(): void {
    this.socket_error = false;
    this.socket_retry_count = 0;
    this.socketSubscibe();
  }

  socketUnsubscribe(): void {
    this.socket.unsubscribe()
  }

  socketClose(): void {
    clearTimeout(this.socket_ping);
    this.socket.unsubscribe();
    this.socket.complete()
    this.socket_connected = false;
  }

  getSocketSettings(): void {
    this._http.get<WsSettings>("api/ws").subscribe({
      next: data => {
        this.session_id = data.session_id;
        this.socket_path = data.socket_path;
        this.username = data.username;
        this.host = data.host.replace("api", "manage");
        this.socket_initialized = true;
        this.socketSubscibe();
      }, error: error => this.parseError(error)
    })
  }


  //////////////////////////////////////////////////////////////////////////////
  /////           FILTER
  //////////////////////////////////////////////////////////////////////////////

  // user adds a filter value
  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) this.filteringItems.push(value);
    // Clear the input value
    event.chipInput!.clear();
    this.applyFilter();
  }


  // user rmeoves a filter value
  remove(item: string): void {
    const index = this.filteringItems.indexOf(item);
    if (index >= 0) this.filteringItems.splice(index, 1);
    this.applyFilter();
  }

  // user selects a value from the list
  selected(event: MatAutocompleteSelectedEvent): void {
    this.filteringItems.push(event.option.viewValue);
    this.filterInput.nativeElement.value = '';
    this.filterInput.nativeElement.blur();
    this.filterForm.get('filterGroup')!.setValue('');
    this.applyFilter();
  }

  // Add new filter value (filter list and count)
  addPossibleFilter(column: string, value: string) {
    var tmp = this.possibleFilteringItems.filter(item => item.column == column);
    if (tmp.length == 0) this.possibleFilteringItems.push({ "column": column, "values": [value] })
    else if (!tmp[0].values.includes(value)) {
      tmp[0].values.push(value)
      tmp[0].values.sort((a: string, b: string) => {
        if (a.toLowerCase() < b.toLowerCase()) return -1;
        else if (a.toLowerCase() > b.toLowerCase()) return 1;
        else return 0;
      });
    }
  }


  updatePossibleFilteringItems(event: any): void {
    this.displayedColumns.forEach(column => {
      if (!["text", "timestamp"].includes(column) && event[column]) {
        if (!this.filteringItems.includes(event[column])){
          if (Array.isArray(event[column])) {
            for (const value in event[column]) {
              this.addPossibleFilter(column, event[column][value]);
            }
          } else this.addPossibleFilter(column, event[column]);
        }
      }
    })


    this.filterOptions = this.filterForm.get('filterGroup')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filterGroup(value)),
    );
  }

  //////////////////////////////////////////////////////////////////////////////
  /////           TABLE
  //////////////////////////////////////////////////////////////////////////////

  applyFilter(init: boolean = false) {
    this.possibleFilteringItems = [];
    if (this.filteringItems.length == 0) this.filteredEventDataSource.data = this.eventDataSource;
    else {
      var tmp: any[] = [];
      const fields_required = this.filteringItems.length;
      this.eventDataSource.forEach(event => {
        var fields_count = 0;
        this.displayedColumns.forEach(column => {
          this.filteringItems.forEach(item=>{
            if (Array.isArray(event[column])) event[column].forEach((entry: string) => { if (entry.toLowerCase().includes(item.toLowerCase())) fields_count += 1 })   
            else if (String(event[column]).toLowerCase().includes(item.toLowerCase())) fields_count += 1
          })
        })
        if (fields_count >= fields_required) tmp.push(event);

      })
      this.filteredEventDataSource.data = tmp;
    }

    this.table.renderRows();
    this.filteredEventDataSource.paginator = this.paginator;
    this.filteredEventDataSource.sort = this.sort;
    this.filteredEventDataSource.data.forEach(event => this.updatePossibleFilteringItems(event))
    if (init) {
      this.sort.sort(({ id: 'timestamp', start: 'desc' }) as MatSortable);
      this.filteredEventDataSource.sort = this.sort;
    }
  }


  //////////////////////////////////////////////////////////////////////////////
  /////           QUICK LINKS
  //////////////////////////////////////////////////////////////////////////////



  openSiteInsights(org_id: string, site_id: string): void {
    const url = "https://" + this.host + "/admin/?org_id=" + org_id + "#!dashboard/insights/site/" + site_id + "/today/" + site_id;
    window.open(url, "_blank");
  }
  openSiteEvents(org_id: string, site_id: string): void {
    const url = "https://" + this.host + "/admin/?org_id=" + org_id + "#!marvis/" + site_id;
    window.open(url, "_blank");
  }


  openDevicesList(device_type: string, org_id: string, site_id: string): void {
    var device = null;
    switch (device_type) {
      case 'ap':
        device = "ap";
        break;
      case 'switch':
        device = "switch";
        break;
      case 'gateway':
        device = "gateway";
        break;
    }
    if (device) {
      const url = "https://" + this.host + "/admin/?org_id=" + org_id + "#!" + device + "/" + site_id;
      window.open(url, "_blank");
    }
  }

  openDeviceConfig(device_type: string, device_mac: string, org_id: string, site_id: string): void {
    var device = null;
    switch (device_type) {
      case 'ap':
        device = "ap";
        break;
      case 'switch':
        device = "switch";
        break;
      case 'gateway':
        device = "gateway";
        break;
    }
    if (device) {
      const url = "https://" + this.host + "/admin/?org_id=" + org_id + "#!" + device + "/detail/00000000-0000-0000-1000-" + device_mac + "/" + site_id;
      window.open(url, "_blank");
    }
  }

  openDeviceInsights(device_type: string, device_mac: string, org_id: string, site_id: string): void {
    var device = null;
    switch (device_type) {
      case 'ap':
        device = "device";
        break;
      case 'switch':
        device = "juniperSwitch";
        break;
      case 'gateway':
        device = "juniperGateway";
        break;
    }
    if (device != "") {
      const url = "https://" + this.host + "/admin/?org_id=" + org_id + "#!dashboard/insights/" + device + "/00000000-0000-0000-1000-" + device_mac + "/" + site_id;
      window.open(url, "_blank");
    }
  }
  openAudit(org_id: string): void {
    const url = "https://" + this.host + "/admin/?org_id=" + org_id + "#!auditLogs";
    window.open(url, "_blank");

  }

  //////////////////////////////////////////////////////////////////////////////
  /////           DIALOG BOXES
  //////////////////////////////////////////////////////////////////////////////

  // CONFIG
  openConfig(): void {
    if (!this.config_opened) {
      this.config_opened = true;
      const dialogRef = this._dialog.open(ConfigDialog, {
        data: { orgs_list: this.orgs, orgs_activated: this.orgs_activated, topics: this.topics, maxItems: this.maxItems }
      });
      dialogRef.afterClosed().subscribe(result => {
        this.config_opened = false;
        if (result) {
          this.maxItems = result.maxItems;
          while (this.eventDataSource.length > this.maxItems) this.eventDataSource.shift();
          this.applyFilter();
          this.orgs_activated = result.orgs_activated;
          this.topics = result.topics;
          this.socketSendSubscribe();
        }
      })
    }
  }

  openDiagram(): void {
    if (!this.diagram_opened) {
      this.diagram_opened = true;
      const dialogRef = this._dialog.open(DiagramDialog);
      dialogRef.afterClosed().subscribe(() => {
        this.diagram_opened = false;
      })
    }
  }

  openLogIn(): void {
    this.wehbook_configured = false;
    if (!this.login_opened) {
      this.login_opened = true;
      const dialogRef = this._dialog.open(LoginDialog, {
        data: { host: this.host, username: this.username, text: "Your authentication session expired. This means you cannont receive new webhook messages anymore, and you need to log back in. You can go back to the login page, stay on this page or log back in to keep your history." }
      });
      dialogRef.afterClosed().subscribe(result => {
        this.login_opened = false;
        if (result) {
          this.getSocketSettings();
          this.openConfig();
        }
      })
    }

  }

  // RAW DASTA
  openRaw(element: any): void {
    const dialogRef = this._dialog.open(RawDialog, {
      data: { raw_message: element.raw_message, raw_event: element.raw_event }
    });
  }

  // SNACK BAR
  openSnackBar(message: string, action: string) {
    this._snackBar.open(message, action, {
      duration: 5000,
      horizontalPosition: "center",
      verticalPosition: "top",
    });
  }

  typeOf(data: any): string {
    return typeof data;
  }

  //////////////////////////////////////////////////////////////////////////////
  /////           BCK TO ORGS
  //////////////////////////////////////////////////////////////////////////////
  logout(): void {
    this._http.post<any>("/api/logout", { session_id: this.session_id }).subscribe({
      next: data => {
        this.socket.complete();
        this.session_id = "";
        this._router.navigate(["/"])
          .catch(console.error)
          .then(() => window.location.reload());
      },
      error: error => this.parseError(error)
    })
  }
}
