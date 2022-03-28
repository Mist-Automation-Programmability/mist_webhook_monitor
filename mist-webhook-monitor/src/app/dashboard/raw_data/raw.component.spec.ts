import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RawDialog } from './raw.component';

describe('RawComponent', () => {
  let component: RawDialog;
  let fixture: ComponentFixture<RawDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RawDialog ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RawDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
