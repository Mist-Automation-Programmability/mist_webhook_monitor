import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiagramDialog } from './diagram.component';

describe('DiagramComponent', () => {
  let component: DiagramDialog;
  let fixture: ComponentFixture<DiagramDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DiagramDialog ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DiagramDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
