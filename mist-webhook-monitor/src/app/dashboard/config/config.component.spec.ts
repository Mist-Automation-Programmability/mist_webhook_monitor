import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigDialog } from './config.component';

describe('ConfigComponent', () => {
  let component: ConfigDialog;
  let fixture: ComponentFixture<ConfigDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConfigDialog ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfigDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
