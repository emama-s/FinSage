/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyArXwksugU7NwrW8D_Pt63FftzG_gKrDnA",
  authDomain: "finsage-8fade.firebaseapp.com",
  projectId: "finsage-8fade",
  storageBucket: "finsage-8fade.firebasestorage.app",
  messagingSenderId: "1015585315673",
  appId: "1:1015585315673:web:b6f9126ed53046c8374a48",
  measurementId: "G-J8FE6BTHF9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
