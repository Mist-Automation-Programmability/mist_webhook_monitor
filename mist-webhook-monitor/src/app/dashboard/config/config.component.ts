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
  public orgs_list: Org[] = [];
  //public orgs_list_selected: Org[] = [];
  public orgs_activated: Org[] = [];
  //public orgs_activated_selected: Org[] = [];
  public topics = {
    "device-events": false,
    "alarms": false,
    "audit": false,
    "device-updowns": false,
    "mxedge-events": false
  }
  topic_list = [];

  constructor(
    public dialogRef: MatDialogRef<ConfigDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  // Init
  ngOnInit(): void {
    this.orgs_list = this.data.orgs_list;
    this.orgs_activated = this.data.orgs_activated;
    this.topics = this.data.topics;
  }

  // Manage Orgs selection
  addOneOrg(org: Org): void {
    const index = this.orgs_list.indexOf(org);
    this.orgs_list.splice(index, 1);
    this.orgs_activated.push(org);
    this.orgs_activated.sort(this.compare);
  }
  deleteOneOrg(org: Org): void {
    const index = this.orgs_activated.indexOf(org);
    this.orgs_activated.splice(index, 1);
    this.orgs_list.push(org);
    this.orgs_list.sort(this.compare);
  }

  // Manage Topics
  updateTopic(topic: string, e: any): void {
    this.topics[topic as keyof Object] = e.checked;
  }

  // Save and Close
  save() {
    var org_ids: string[] = []
    var topics: string[]=[];
    this.orgs_activated.forEach(org => {
      org_ids.push(org.org_id)
    })
    for (var topic in this.topics){
      if ((this.topics as any)[topic]) topics.push(topic)
    }
    this.dialogRef.close({
      org_ids: org_ids,
      topics: topics
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