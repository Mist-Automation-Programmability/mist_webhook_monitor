import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from './login/login.component'
import { DashboardComponent } from './dashboard/dashboard.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'monitor', component: DashboardComponent },
  //  { path: 'customization', component: CustomizationComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' }, // redirect to `first-component`
  { path: '**', redirectTo: '/login' }, // redirect to `first-component`
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
