import { Injectable, NgZone } from '@angular/core';
import { User } from '../services/user';
import * as auth from 'firebase/auth';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  userData: any; // Save logged in user data
  constructor(
    public afs: AngularFirestore, // Inject Firestore service
    public afAuth: AngularFireAuth, // Inject Firebase auth service
    public router: Router,
    public ngZone: NgZone, // NgZone service to remove outside scope warning
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) {
    /* Saving user data in localstorage when 
    logged in and setting up null when logged out */
    this.afAuth.authState.subscribe((user) => {
      if (user) {
        this.userData = user;
        localStorage.setItem('user', JSON.stringify(this.userData));
        JSON.parse(localStorage.getItem('user')!);
      } else {
        localStorage.setItem('user', 'null');
        JSON.parse(localStorage.getItem('user')!);
      }
    });
  }
  // Returns true when user is looged in and email is verified
  get isLoggedIn(): boolean {
    const user = JSON.parse(localStorage.getItem('user')!);
    return user !== null && user.emailVerified !== false ? true : false;
  }
  // Sign in with Google
  GoogleAuth() {
    const provider = new auth.GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/webmasters'); // Добавляем требуемую область (scope)

    return this.AuthLogin(provider).then((res: any) => {
    this.router.navigate(['dashboard']);
  });
  }

  private apiUrl = 'https://searchconsole.googleapis.com/webmasters/v3/sites/sc-domain%3Aenguide.pl/searchAnalytics/query';
  // Auth logic to run auth providers
  AuthLogin(provider: any) {
    return this.afAuth
      .signInWithPopup(provider)
      .then((result) => {
        this.router.navigate(['dashboard']);
        this.SetUserData(result.user);
        this.fetchData(result, '2023-06-07','2023-09-07', ['PAGE'], 10).subscribe(
          (response) => {
            // Обработка данных из ответа
            console.log('Ответ от сервера:', response);
          },
          (error) => {
            // Обработка ошибок
            console.error('Произошла ошибка при выполнении запроса:', error);
          }
        )
      })
      .catch((error) => {
        this.snackBar.open(error.message, '', { duration: 3000 });
      });
  }
  /* Setting up user data when sign in with username/password, 
  sign up with username/password and sign in with social auth  
  provider in Firestore database using AngularFirestore + AngularFirestoreDocument service */
  SetUserData(user: any) {
    const userRef: AngularFirestoreDocument<any> = this.afs.doc(
      `users/${user.uid}`
    );
    const userData: User = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
    };
    
    return userRef.set(userData, {
      merge: true,
    });
  }
  // Sign out
  SignOut() {
    return this.afAuth.signOut().then(() => {
      localStorage.removeItem('user');
      this.router.navigate(['mainPage']);
    });
  }

  fetchData(accessToken: any, startDate: string, endDate: string, dimensions: string[], rowLimit: number): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${accessToken.credential.accessToken}`,
      'Content-Type': 'application/json',
    });

    const body = {
      startDate,
      endDate,
      dimensions,
      rowLimit,
    };

    return this.http.post(this.apiUrl, body, { headers });
  }
}
