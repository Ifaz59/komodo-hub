# User Manual - Komodo Hub

## Getting Started

Open your browser and go to `http://localhost:3000`. You'll land on the homepage showing platform stats and the main feature sections.

You can browse species and campaigns without an account. To donate, report sightings, or register for events you need to be logged in.

## Creating an Account

Click **Login** in the navbar, then click the register link at the bottom of the form. Fill in your name, email, and password. By default new accounts are set to `registered_user` role. An admin can upgrade your role.

## Browsing Species

Click **Species** in the nav. You can search by name or filter by conservation status (Critically Endangered, Endangered, Vulnerable). Click any species card to see full details including habitat, population estimate, and threats.

## Reporting a Sighting

You need to be logged in. Click **Report Sighting** in the navbar. Select the species from the dropdown, enter the location, date, and a description. You can upload a photo directly or leave the image field blank. Hit Submit.

Your sighting will appear in the Sightings feed with a **Pending** badge until an admin verifies it.

## Donating to a Campaign

Go to **Campaigns**, pick one and click it to open the detail page. If you're logged in, you'll see a donation form. Pick a preset amount ($10, $25, $50, $100) or type a custom amount. You can leave an optional message. Click **Donate Now**.

The campaign progress bar updates immediately after your donation.

## Volunteer Events

Go to **Events** to see upcoming conservation events. Click **Register** on any event to sign up. You can see your registrations from your profile page.

## Profile Page

Click your name/profile in the navbar. You can update your name, bio, and avatar URL. The page also shows quick links to your donation history and sightings.

## Admin Dashboard

Only accessible to users with the `admin` role. Click **Admin** in the navbar.

Tabs available:
- **Overview** – platform stats
- **Users** – view all registered users and change their roles
- **Species** – add, edit or delete species entries (supports image upload)
- **Campaigns** – manage fundraising campaigns
- **Events** – manage volunteer events
- **Sightings** – verify or reject community-reported sightings

### Uploading Images (Admin)

On any species, campaign, or event edit form there's an **Upload Image** button. Click it to select a file from your computer. The image uploads to the server and the URL fills in automatically. You can also paste an image URL directly into the URL field below the button.
