import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcryptjs";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
import env from "dotenv";
import axios from "axios";
import moment from "moment";
import flash from "connect-flash";
import GoogleStrategy from "passport-google-oauth2";
// Firebase Related import
import { auth, db } from "./public/config/firebase-config.js";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  orderBy,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { OAuth2Client } from "google-auth-library";
//AdminJS Related Imports
import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import { Sequelize } from 'sequelize';
import AdminJSSequelize from '@adminjs/sequelize';
// import UserModel from './models/user.entity.js';
import { DataTypes } from 'sequelize';
// import { pool } from './db'; // Assuming you are using pool from pg package

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Initialize Sequelize
// const sequelize = new Sequelize({
//   dialect: 'postgres',
//   username: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
// });



// AdminJS.registerAdapter(AdminJSSequelize);


// const UserModel = sequelize.define(
//   'User',
//   {
//     user_id: {
//       type: DataTypes.INTEGER,
//       primaryKey: true,
//       autoIncrement: true,
//     },
//     username: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     password: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     role: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       defaultValue: 'user', // Default role
//     },
//   },
//   {
//     tableName: 'users', // Map this model to your `users` table
//     timestamps: false,  // Disable timestamps if they are not in the table
//   }
// );


// // Initialize AdminJS
// const adminJS = new AdminJS({
//   databases: [sequelize],  // Pass your sequelize instance
//   rootPath: '/admin',  // Set custom admin path
//   // resources: [{
//   //   resource: UserModel,  // Your user Sequelize model
//   //   options: {
//   //     actions: {
//   //       edit: {
//   //         isAccessible: ({ currentAdmin }) => currentAdmin.role === 'superadmin',
//   //       },
//   //       delete: {
//   //         isAccessible: ({ currentAdmin }) => currentAdmin.role === 'superadmin',
//   //       },
//   //       new: {
//   //         isAccessible: ({ currentAdmin }) => currentAdmin.role === 'superadmin',
//   //       },
//   //     },
//   //   },
//   // }],
//   branding: {
//     companyName: 'ETConnect',  // Custom branding (optional)
//   },
// });

// const router = AdminJSExpress.buildRouter(adminJS);

// // Use AdminJS routes
// app.use(adminJS.options.rootPath, router);

// app.use('/admin', (req, res, next) => {
//   if (!req.isAuthenticated()) {
//     return res.redirect('/login');  // redirect if not authenticated
//   }
  
//   // Assuming user role is stored in req.user
//   if (req.user.role !== 'superadmin') {
//     return res.status(403).send('Forbidden');  // Send 403 for non-admin users
//   }
  
//   next();  // Continue to the AdminJS route
// });


// app.use('/admin', (req, res, next) => {
//   if (!req.isAuthenticated()) {
//     return res.redirect('/login');  // Redirect unauthenticated users to login
//   }
  
//   if (req.user.role !== 'superadmin') {
//     return res.status(403).send('Forbidden');  // Block non-superadmin users
//   }
  
//   next();  // Allow access for superadmin
// });


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////


app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// Helper function to format dates
const formatDate = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

app.use(async (req, res, next) => {
  try {
    const today = new Date();
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);

    // Query Firestore to get all bookings in the next 30 days
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('date', '>=', today.toISOString().split('T')[0]),
      where('date', '<=', thirtyDaysLater.toISOString().split('T')[0])
    );

    const bookingsSnapshot = await getDocs(bookingsQuery);
    const bookings = bookingsSnapshot.docs.map(doc => doc.data());

    // Query Firestore to get all room names
    const roomsSnapshot = await getDocs(collection(db, 'meeting_rooms'));
const roomNames = roomsSnapshot.docs.reduce((acc, doc) => {
  const roomData = doc.data();
  const roomId = doc.id;  // Firestore document ID used as room_id
  acc[roomId] = roomData.name; // Store the room name with roomId as key
  return acc;
}, {});

    // Initialize an object to track booked time slots for each room and each date
    const timeSlotsByRoomAndDate = {};

    // Process each booking
    for (const booking of bookings) {
      const { room_id, date, starttime, endtime } = booking;

      // Parse the start and end times
      const bookingStart = new Date(`${date}T${starttime}`);
      const bookingEnd = new Date(`${date}T${endtime}`);

      // Divide the day into 30-minute intervals (from 8 AM to 6 PM)
      const timeSlots = [];
      for (
        let slot = new Date(`${date}T08:00`);
        slot < new Date(`${date}T18:00`);
        slot.setMinutes(slot.getMinutes() + 30)
      ) {
        timeSlots.push(new Date(slot).toISOString());
      }

      // Mark booked time slots for a specific room and date
      for (let slot of timeSlots) {
        const slotTime = new Date(slot);
        if (slotTime >= bookingStart && slotTime < bookingEnd) {
          if (!timeSlotsByRoomAndDate[room_id]) {
            timeSlotsByRoomAndDate[room_id] = {};
          }
          if (!timeSlotsByRoomAndDate[room_id][date]) {
            timeSlotsByRoomAndDate[room_id][date] = new Set();
          }
          timeSlotsByRoomAndDate[room_id][date].add(slot);
        }
      }
    }

    // Identify fully booked days for each room (20 slots = 8 AM - 6 PM)
    const fullyBookedRooms = {};

    for (const room_id in timeSlotsByRoomAndDate) {
      for (const date in timeSlotsByRoomAndDate[room_id]) {
        const bookedSlots = timeSlotsByRoomAndDate[room_id][date];
        if (bookedSlots.size === 20) {
          const room_name = roomNames[room_id]; // Get the room name from the roomNames map
          if (!fullyBookedRooms[room_name]) {
            fullyBookedRooms[room_name] = [];
          }
          fullyBookedRooms[room_name].push(formatDate(new Date(date)));
        }
      }
    }

    // Make data available to all templates
    res.locals.fullyBookedRooms = fullyBookedRooms;
    res.locals.user = req.isAuthenticated() ? req.user : null;

    next();
  } catch (err) {
    console.error('Error fetching data from Firestore:', err);
    next(err); // Pass the error to the next middleware
  }
});

// Example route to render fully booked rooms data
app.get('/rooms/fully-booked', (req, res) => {
  res.render('fullyBookedRooms', {
    fullyBookedRooms: res.locals.fullyBookedRooms
  });
});




app.get('/api/user', (req, res) => {
   const user = req.isAuthenticated() ? req.user : null;
   res.json(user); // Send the user data as JSON response
});

app.get("/", async (req, res) => {
  res.render("index.ejs", { messages: req.flash('error') });
});

app.get("/login", (req, res) => {
  res.render("login.ejs", { messages: req.flash('error')});
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    // Redirect back to the referrer (the current page)
    res.redirect(req.get("referer") || "/"); // Fallback to home if referer is not available
  });
});


app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get("/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
);

app.get("/confirmation", async (req, res) => {
  res.render("confirmation.ejs");
});

app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try {
    // Check if the email already exists in Firestore
    const userQuerySnapshot = await getDocs(query(collection(db, "users"), where("email", "==", email)));

    if (!userQuerySnapshot.empty) {
      res.render("register.ejs", { errorMessage: "Email already exists. Try logging in." });
    } else {
      // Hash the password using bcrypt
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          // Save the user to Firestore
          await addDoc(collection(db, "users"), {
            email: email,
            password: hash,  // Store the hashed password
            role: "user",     // Default role, can be modified as needed
            createdAt: new Date(),
          });

          res.render("login.ejs");
        }
      });
    }
  } catch (err) {
    console.log(err);
    res.render("register.ejs", { errorMessage: "An error occurred. Please try again." });
  }
});


app.post("/login", passport.authenticate("local", {
  successRedirect: '/',  // Redirect to the landing page on success
  failureRedirect: '/login',  // Redirect to login page on failure
  failureFlash: true  // Enable flash messages on failure
})
);

passport.use("local", 
  new Strategy(async function verify(username, password, cb) {
    try {
      // Query Firestore for the user by username
      const userQuerySnapshot = await getDocs(query(collection(db, "users"), where("email", "==", username)));

      if (!userQuerySnapshot.empty) {
        const user = userQuerySnapshot.docs[0].data();  // Get the first document (user)
        const storedHashedPassword = user.password;     // The hashed password from Firestore

        // Compare provided password with stored hashed password
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            // Error comparing passwords
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              // Password matches
              if (user.role === 'superadmin') {
                return cb(null, user, { message: 'Redirecting to AdminJS...' });  // For superadmin
              } else {
                return cb(null, user);  // For other roles
              }
            } else {
              // Password doesn't match
              return cb(null, false, { message: 'Incorrect username or password.' });
            }
          }
        });
      } else {
        // User not found in Firestore
        return cb(null, false, { message: 'User not found, please sign up first.' });
      }
    } catch (err) {
      console.error("Error in local strategy:", err);
      return cb(err);
    }
  })
);

passport.use("google", new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "https://your-app-url.com/auth/google/callback",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
}, async (accessToken, refreshToken, profile, cb) => {
  try {
    const email = profile.emails[0].value;

    // Check if the user exists in Firestore
    const userQuerySnapshot = await getDocs(query(collection(db, "users"), where("email", "==", email)));

    if (userQuerySnapshot.empty) {
      // If the user doesn't exist, create a new user
      await addDoc(collection(db, "users"), {
        email: email,
        password: "google",  // Assign a default password (you may not need this)
        role: "user",        // Default role can be changed
        createdAt: new Date(),
      });
    }

    return cb(null, { email: email, role: "user" }); // Return user object for passport

  } catch (err) {
    console.log(err);
    return cb(err);
  }
}));

app.get("/bookinglist", async (req, res) => {
  try {
    const currentDate = moment(); // Get the current date and time
    const currentDateString = currentDate.format("YYYY-MM-DD");
    const currentTime = currentDate.format("HH:mm:ss");
    const pastLimitDate = moment().subtract(30, "days").format("YYYY-MM-DD");

    // Query for upcoming bookings (today or after today), ordered by date and starttime
    const upcomingQuery = query(
      collection(db, "bookings"),
      where("date", ">=", currentDateString),  // Fetch bookings for today and beyond
      orderBy("date", "asc"),
      orderBy("starttime", "asc")
    );

    // Query for past bookings (before today), ordered by date and starttime
    const pastQuery = query(
      collection(db, "bookings"),
      where("date", "<", currentDateString),
      where("date", ">=", pastLimitDate),
      orderBy("date", "desc"),
      orderBy("starttime", "desc")
    );

    const upcomingSnapshot = await getDocs(upcomingQuery);
    const pastSnapshot = await getDocs(pastQuery);

    // Function to format bookings
    const formatBookings = (snapshot) => {
      return snapshot.docs.map(doc => {
        const data = doc.data();
        const bookingDate = moment(data.date);
        const endTime = moment(data.endtime, "HH:mm:ss");

        let status = "upcoming"; // Default status

        // Check if the booking is in the past (based on end time)
        if (bookingDate.isBefore(currentDate, "day") || 
            (bookingDate.isSame(currentDate, "day") && endTime.isBefore(currentDate, "minute"))) {
          status = "past"; // Set status as 'past' if date is before today or time has passed for today
        }

        return {
          booking_id: doc.id,
          username: data.email || 'Unknown', // Default value if 'name' is missing
          date: bookingDate.format("DD-MM-YYYY"),
          start_time: data.starttime || 'N/A',
          end_time: data.endtime || 'N/A',
          description: data.des || data.description || 'No description',
          room: data.room_name ? data.room_name.replace(/\[.*?\]|\(.*?\)/g, '').split(' ').slice(0, 2).join(' ') : '2',
          booking_date: data.created_at ? 
  (data.created_at.toDate ? moment(data.created_at.toDate()).format("YYYY-MM-DD") : moment(data.created_at).format("YYYY-MM-DD")) 
  : 'N/A',

          status: status // Add status field to track whether booking is past or upcoming
        };
      });
    };

    // Format both upcoming and past bookings
    const upcomingBookings = formatBookings(upcomingSnapshot);
    const pastBookings = formatBookings(pastSnapshot);

    // Filter past bookings from upcoming ones based on status
    const allBookings = [...upcomingBookings, ...pastBookings];
    const filteredUpcomingBookings = allBookings.filter(booking => booking.status === "upcoming");
    const filteredPastBookings = allBookings.filter(booking => booking.status === "past");

    res.render("bookinglist.ejs", { upcomingBookings: filteredUpcomingBookings, pastBookings: filteredPastBookings });
  } catch (err) {
    console.error("Error retrieving bookings:", err);
    res.status(500).send("Error retrieving bookings.");
  }
});


app.get("/mybookings", async (req, res) => {
  if (req.isAuthenticated()) {
    const currentDate = moment().format("YYYY-MM-DD");
    const currentTime = moment().format("HH:mm:ss");
    const userEmail = req.user.email; // Assuming user email is stored in Firebase users

    try {
      // Fetch all bookings for the logged-in user
      const allBookingsQuery = query(
        collection(db, "bookings"),
        where("email", "==", userEmail), // Filter by logged-in user's email
        orderBy("date", "asc"), // Sort by date first
        orderBy("starttime", "asc") // Then sort by start time
      );

      const bookingsSnapshot = await getDocs(allBookingsQuery);

      // Format and classify bookings into "upcoming" and "past"
      const formattedBookings = bookingsSnapshot.docs.map((doc) => {
        const data = doc.data();
        const bookingEndTime = moment(`${data.date} ${data.endtime}`, "YYYY-MM-DD HH:mm:ss");

        return {
          booking_id: doc.id,
          username: data.email || "Unknown", // Default to 'Unknown' if 'email' is missing
          date: moment(data.date).format("DD-MM-YYYY"),
          start_time: moment(data.starttime, "HH:mm:ss").format("HH:mm")|| "Invalid", // Format start time to HH:mm
          end_time: moment(data.endtime, "HH:mm:ss").format("HH:mm") || "Invalid", // Format end time to HH:mm
          description: data.des || data.description || "No description",
          room: data.room_name ? data.room_name.replace(/\[.*?\]|\(.*?\)/g, '').split(' ').slice(0, 2).join(' ') : '2',
          booking_date: data.created_at ? 
  (data.created_at.toDate ? moment(data.created_at.toDate()).format("YYYY-MM-DD") : moment(data.created_at).format("YYYY-MM-DD")) 
  : 'N/A',

          isPast: bookingEndTime.isBefore(moment(`${currentDate} ${currentTime}`, "YYYY-MM-DD HH:mm:ss"), "minute"), // Check if booking has already passed
          rawDate: moment(data.date, "YYYY-MM-DD"), // Raw date for sorting
          rawEndTime: moment(data.endtime, "HH:mm:ss"), // Raw time for sorting
        };
      });

      // Separate past and upcoming bookings
      const pastBookings = formattedBookings
        .filter((booking) => booking.isPast) // Only include past bookings
        .sort((a, b) => {
          const dateComparison = b.rawDate.diff(a.rawDate); // Compare by date (descending)
          if (dateComparison === 0) {
            // If dates are the same, compare by end time (descending)
            return b.rawEndTime.diff(a.rawEndTime);
          }
          return dateComparison;
        });

      const upcomingBookings = formattedBookings.filter((booking) => !booking.isPast); // Only include upcoming bookings

      // Render the bookings in the mybookings.ejs view
      res.render("mybookings.ejs", {
        upcomingMyBookings: upcomingBookings,
        pastMyBookings: pastBookings,
      });
    } catch (err) {
      console.error("Error retrieving your bookings:", err);
      res.status(500).send("Error retrieving your bookings.");
    }
  } else {
    res.redirect("/login");
  }
});

app.get('/edit-booking/:id', async (req, res) => {
  if (req.isAuthenticated()) {
    const booking_id = req.params.id;

    try {
      // Query only the specific booking by booking_id in Firestore
      const bookingDocRef = doc(db, "bookings", booking_id);
      const bookingDoc = await getDoc(bookingDocRef);

      if (!bookingDoc.exists()) {
        return res.status(404).send('Booking not found');
      }

      // Use the booking data as needed
      const booking = bookingDoc.data();
      booking.booking_id = bookingDoc.id; // Add the document ID as booking_id
      if (booking.des) {
        booking.description = booking.des;
        delete booking.des; // Remove the original 'des' field to avoid confusion
      }


      // Format the date to DD-MM-YYYY
      booking.date = moment(booking.date).format('DD-MM-YYYY');
      booking.start_time = moment(booking.starttime, 'HH:mm:ss').format('HH:mm'); // Adjust format as needed
      booking.end_time = moment(booking.endtime, 'HH:mm:ss').format('HH:mm'); // Adjust format as needed

      // Render the booking data into editBookings.ejs
      res.render('editBookings.ejs', { booking });
    } catch (error) {
      console.error('Error fetching booking:', error);
      res.status(500).send('Server error');
    }
  } else {
    res.redirect("/login");
  }
});


app.post('/edit', async (req, res) => {
  console.log("Form data received:", req.body);
  if (req.isAuthenticated()) {
    console.log("Request Body:", req.body);
    const { bookingId, room_id, date, start, end, purpose } = req.body;

    const updatedPurpose = purpose || 'Not Stated';

    // Reformat date to YYYY-MM-DD
    const [day, month, year] = date.split('-');
    const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    const formattedStartTime = moment(start, 'HH:mm').format('HH:mm:ss');
    const formattedEndTime = moment(end, 'HH:mm').format('HH:mm:ss');

    try {
      // Step 1: Fetch room details (name and capacity) from the database using room_id
      const roomDoc = await getDoc(doc(db, "meeting_rooms", room_id));
      if (!roomDoc.exists()) {
        return res.status(404).send("Room not found");
      }
      const roomData = roomDoc.data();
      const room_name = `${roomData.name} (Capacity: ${roomData.capacity})`;

      // Step 2: Update the booking details in Firestore
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, {
        date: formattedDate,
        starttime: formattedStartTime,
        endtime: formattedEndTime,
        description: updatedPurpose,
        room_id: room_id,
        room_name: room_name,
        created_at: new Date().toISOString(),
      });

      // Step 3: Delete existing timeslots associated with the booking
      const timeslotsQuery = query(
        collection(db, "timeslots"),
        where("booking_id", "==", bookingId)
      );
      const timeslotsSnapshot = await getDocs(timeslotsQuery);

      const deletePromises = timeslotsSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);

      // Step 4: Generate and insert new timeslots
      const timeslots = [];
      let startTime = new Date(`1970-01-01T${start}`);
      let endTime = new Date(`1970-01-01T${end}`);

      while (startTime < endTime) {
        const slotTime = startTime.toTimeString().substring(0, 5);
        timeslots.push(slotTime);

        // Add each new timeslot to Firestore
        await addDoc(collection(db, "timeslots"), {
          booking_id: bookingId,
          timeslot: slotTime,
        });

        startTime.setMinutes(startTime.getMinutes() + 15);
      }

      res.render("confirmation.ejs", {
        booking: {
          id: bookingId,
          date: `${day}-${month}-${year}`,
          startTime: start,
          endTime: end,
          room: room_name ? room_name.replace(/\[.*?\]|\(.*?\)/g, '').split(' ').slice(0, 2).join(' ') : '2',
          purpose: updatedPurpose,
        },
        timeslots,
      });
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).send("Error updating booking");
    }
  } else {
    res.redirect("/login");
  }
});


app.post('/next', async (req, res) => {
  const { room_id, date, purpose, start, end } = req.body;

  // Validate required fields
  if (!room_id || !date) {
    return res.status(400).send('room_id and date are required');
  }

  // Reformat date to YYYY-MM-DD
  let formattedDate;
  try {
    const [day, month, year] = date.split('-');
    formattedDate = `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Invalid date format:', date);
    return res.status(400).send('Invalid date format');
  }

  try {
    // Fetch room details from Firestore
    const roomDoc = await getDoc(doc(db, 'meeting_rooms', room_id));
    if (!roomDoc.exists()) {
      console.error('Room not found for room_id:', room_id);
      return res.status(400).send('Room not found');
    }

    const roomName = `${roomDoc.data().name} (Capacity: ${roomDoc.data().capacity})`;

    // Validate roomName and formattedDate
    if (!formattedDate || !roomName) {
      console.error('Invalid query parameters:', { formattedDate, roomName });
      return res.status(400).send('Invalid query parameters');
    }

    // Query Firestore for bookings on the given date and room
    const bookingsRef = collection(db, 'bookings');
    const bookingsQuery = query(
      bookingsRef,
      where('date', '==', formattedDate),
      where('room_name', '==', roomName)
    );

    const bookingsSnapshot = await getDocs(bookingsQuery);

    if (bookingsSnapshot.empty) {
      return res.json({ timeslots: [], end_times: [], start_times: [], booking_ids: [] });
    }

    const timeslots = [];
    const endTimes = [];
    const startTimes = [];
    const bookingIds = [];

    bookingsSnapshot.forEach((doc) => {
      const { starttime, endtime } = doc.data();

      const [startHours, startMinutes] = starttime.split(':').map(Number);
      const [endHours, endMinutes] = endtime.split(':').map(Number);

      const startDateTime = new Date(1970, 0, 1, startHours, startMinutes);
      const endDateTime = new Date(1970, 0, 1, endHours, endMinutes);

      let currentTime = startDateTime;
      while (currentTime < endDateTime) {
        const slot = currentTime.toTimeString().substring(0, 5);
        timeslots.push(slot);
        currentTime.setMinutes(currentTime.getMinutes() + 15);
      }

      startTimes.push(starttime);
      endTimes.push(endtime);
      bookingIds.push(doc.id);
    });

    res.json({ timeslots, end_times: endTimes, start_times: startTimes, booking_ids: bookingIds });

  } catch (error) {
    console.error('Error fetching timeslots and end_times:', error);
    res.status(500).send('Error fetching timeslots and end_times');
  }
});


app.post('/submit', async (req, res) => {
  if (req.isAuthenticated()) {
    let { room_id, date, start, end, purpose } = req.body;
    room_id = room_id || null; // Default room ID (null if not selected)
    purpose = purpose || 'Not Stated'; // Default purpose

    // Reformat the date
    const [day, month, year] = date.split('-');
    const formattedDate = `${year}-${month}-${day}`;

    try {
      // Step 1: Fetch the room name and capacity based on room_id
      let roomName = null;
      if (room_id) {
        const roomDoc = await getDoc(doc(db, 'meeting_rooms', room_id));
        if (roomDoc.exists()) {
          const roomData = roomDoc.data();
          const capacity = roomData.capacity || "Unknown"; // Fetch room capacity (default "Unknown" if not available)
          roomName = `${roomData.name} (Capacity: ${capacity})`; // Combine room name and capacity
        }
      }

      // Step 2: Insert booking details into Firestore
      const bookingData = {
        // user_id: req.user.uid, // Use the authenticated user's UID
        name: req.user.email || "Anonymous", // Add user's name if available
        email: req.user.email, // Add user's email
        date: formattedDate,
        starttime: start,
        endtime: end,
        description: purpose,
        created_at: new Date().toISOString(), // Use ISO format for created_at
        room_id: room_id, // Include the selected room's ID
        room_name: roomName, // Include the selected room's name with capacity
      };

      // Add the booking data to the "bookings" collection
      const bookingRef = await addDoc(collection(db, "bookings"), bookingData);

      // Step 3: Prepare data for the confirmation page
      const queryParams = new URLSearchParams({
        id: bookingRef.id,
        date: formattedDate,
        startTime: start,
        endTime: end,
        room: roomName || "Room 1",
        purpose: purpose,
      }).toString();

      // Redirect to confirmation page with booking data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.redirect(`/confirmation?${queryParams}`);
    } catch (error) {
      console.error('Error saving booking:', error);
      res.status(500).send('Error saving booking');
    }
  } else {
    res.redirect('/login');
  }
});




app.get('/calendarPage', async (req, res) => {
  try {
    const currentDate = moment(); // Get the current date and time
    const currentDateString = currentDate.format("YYYY-MM-DD");
    const currentTime = currentDate.format("HH:mm:ss");
    const pastLimitDate = moment().subtract(30, "days").format("YYYY-MM-DD"); // Date 30 days ago

    // Query for upcoming bookings (today or after today), ordered by date and starttime
    const upcomingQuery = query(
      collection(db, "bookings"),
      where("date", ">=", currentDateString),  // Fetch bookings for today and beyond
      orderBy("date", "asc"),
      orderBy("starttime", "asc")
    );

    // Query for past bookings (before today), ordered by date and starttime
    const pastQuery = query(
      collection(db, "bookings"),
      where("date", "<", currentDateString),
      where("date", ">=", pastLimitDate),
      orderBy("date", "asc"),
      orderBy("starttime", "asc")
    );

    const upcomingSnapshot = await getDocs(upcomingQuery);
    const pastSnapshot = await getDocs(pastQuery);

    // Function to format bookings
    const formatBookings = (snapshot) => {
      return snapshot.docs.map(doc => {
        const data = doc.data();
        const bookingDate = moment(data.date);
        const endTime = moment(data.endtime, "HH:mm:ss");

        let status = "upcoming"; // Default status

        // Check if the booking is in the past (based on end time)
        if (bookingDate.isBefore(currentDate, "day") || 
            (bookingDate.isSame(currentDate, "day") && endTime.isBefore(currentDate, "minute"))) {
          status = "past"; // Set status as 'past' if date is before today or time has passed for today
        }

        return {
          booking_id: doc.id,
          username: data.email || 'Unknown', // Default value if 'name' is missing
          date: bookingDate.format("DD-MM-YYYY"),
          start_time: data.starttime || 'N/A',
          end_time: data.endtime || 'N/A',
          description: data.des || data.description || 'No description',
          room: data.room_name ? data.room_name.replace(/\[.*?\]|\(.*?\)/g, '').split(' ').slice(0, 2).join(' ') : '2',
          booking_date: moment(data.created_at).format("DD-MM-YYYY"),
          status: status // Add status field to track whether booking is past or upcoming+
        };
      });
    };

    // Format both upcoming and past bookings
    const upcomingBookings = formatBookings(upcomingSnapshot);
    const pastBookings = formatBookings(pastSnapshot);

    // Filter past bookings from upcoming ones based on status
    const allBookings = [...upcomingBookings, ...pastBookings];
    const filteredUpcomingBookings = allBookings.filter(booking => booking.status === "upcoming");
    const filteredPastBookings = allBookings.filter(booking => booking.status === "past");

    // Pass formatted bookings to your calendar view
    res.render('calendar.ejs', { upcomingBookings: filteredUpcomingBookings, pastBookings: filteredPastBookings });
  } catch (err) {
    console.error("Error retrieving bookings:", err);
    res.status(500).send("Error retrieving bookings.");
  }
});

app.get('/delete/:id', async (req, res) => {   
  if (req.isAuthenticated()) {
    const bookingId = req.params.id; // Extract bookingId from the URL
    const userEmail = req.user.email; // Get the email of the logged-in user

    try {
      const bookingRef = doc(db, "bookings", bookingId);
      const bookingSnap = await getDoc(bookingRef);
  
      if (!bookingSnap.exists()) {
        return res.status(404).send("Booking not found");
      }
  
      // Verify that the booking belongs to the current user
      const bookingData = bookingSnap.data();
      if (bookingData.email !== userEmail) {
        return res.status(403).send("Not authorized to delete this booking");
      }
  
      await deleteDoc(bookingRef);
      res.render('delete-confirmation.ejs', {
        bookingId: req.params.id,
        user: req.session.user
      });
    } catch (error) {
      console.error('Error deleting booking:', error);
      res.status(500).send('Error deleting booking');
    }
  } else {
    res.redirect('/login');
  }
});


// Delete confirmation route
app.get('/delete-confirmation', (req, res) => {
  res.render('delete-confirmation.ejs');
});


passport.serializeUser((user, cb) => {
  cb(null, user.uid); // Serialize user_id to session
});

passport.deserializeUser(async (id, cb) => {
  try {
    const q = query(collection(db, "users"), where("uid", "==", id));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      cb(null, querySnapshot.docs[0].data());
    } else {
      cb(new Error("User not found"));
    }    
  } catch (err) {
    cb(err);
  }
});


app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});


//added a comment for github activeness