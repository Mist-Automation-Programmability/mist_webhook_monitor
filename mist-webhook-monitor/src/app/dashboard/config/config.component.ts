import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface Org {
  org_id: string;
  name: string;
}

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['../dashboard.component.css', './config.component.css']
})
export class ConfigDialog implements OnInit {
  public orgs_available: Org[] = [];
  public search_available_orgs: string = ""
  public orgs_activated: Org[] = [];
  public search_activated_orgs: string = ""
  public topics = {
    "device-events": false,
    "alarms": false,
    "audits": false,
    "device-updowns": false,
    "mxedge-events": false
  }


  topic_list = [];
  
  public maxItems: number = 10000;
  
  constructor(
    public dialogRef: MatDialogRef<ConfigDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  // Init
  ngOnInit(): void {
    this.orgs_available = this.data.orgs_list;
    this.orgs_activated = this.data.orgs_activated;
    this.topics = this.data.topics;
    this.maxItems = this.data.maxItems;
  }

  // Manage Orgs selection
  addOneOrg(org: Org): void {
    const index = this.orgs_available.indexOf(org);
    this.orgs_available.splice(index, 1);
    this.orgs_activated.push(org);
    this.orgs_activated.sort(this.compare);
  }
  deleteOneOrg(org: Org): void {
    const index = this.orgs_activated.indexOf(org);
    this.orgs_activated.splice(index, 1);
    this.orgs_available.push(org);
    this.orgs_available.sort(this.compare);
  }

  // Manage Topics
  updateTopic(topic: string, e: any): void {
    this.topics[topic as keyof Object] = e.checked;
  }

  // Save and Close
  save() {
    this.dialogRef.close({
      orgs_activated: this.orgs_activated,
      topics: this.topics,
      maxItems : this.maxItems
    });
  }
  cancel(): void {
    this.dialogRef.close();
  }

  // Used to order the orgs 
  compare(a: Org, b: Org): number {
    // Use toUpperCase() to ignore character casing
    const nameA = a.name.toUpperCase();
    const nameB = b.name.toUpperCase();

    let comparison = 0;
    if (nameA > nameB) {
      comparison = 1;
    } else if (nameA < nameB) {
      comparison = -1;
    }
    return comparison;
  }
}