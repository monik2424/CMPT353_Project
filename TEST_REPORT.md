# Test Report — CMPT 353 Project 1
**Channel-Based Programming Q&A Tool**
**Testing method:** Manual — browser + Docker

---

## Setup

Before running any test:
```bash
docker-compose down -v          # wipe old DB
docker-compose up --build       # fresh build + seed
```
Open **http://localhost:3000** in a browser.
Confirm `http://localhost:3000/api/health` returns `"status": "ok"`.

---

## Test Cases

### TC-01 — Landing page loads

**Feature:** Part 1 — Basic system  
**Steps:**
1. Open `http://localhost:3000`

**Expected:** Page displays the app name, a short description, and a "Browse Channels" link.  
**Result:** ___  
**Screenshot:** *(screenshot of landing page)*

---

### TC-02 — Register a new account

**Feature:** Part 2 — Accounts  
**Steps:**
1. Go to `http://localhost:3000/register`
2. Enter Display Name: `TestUser1`
3. Enter Password: `testpass1`
4. Enter Confirm Password: `testpass1`
5. Click **Sign Up**

**Expected:** Redirected to `/login` with a success message ("Account created").  
**Result:** ___  
**Screenshot:** *(screenshot of login page showing registration success message)*

---

### TC-03 — Register with duplicate display name is rejected

**Feature:** Part 2 — Input validation  
**Steps:**
1. Go to `http://localhost:3000/register`
2. Enter Display Name: `Alice` (already seeded)
3. Enter Password: `anything123`
4. Enter Confirm Password: `anything123`
5. Click **Sign Up**

**Expected:** Error message shown: "Display name already taken". No redirect.  
**Result:** ___  
**Screenshot:** *(screenshot of error message on register page)*

---

### TC-04 — Login with valid credentials (regular user)

**Feature:** Part 2 — Accounts  
**Steps:**
1. Go to `http://localhost:3000/login`
2. Enter Display Name: `Alice`
3. Enter Password: `password123`
4. Click **Sign In**

**Expected:** Redirected to `/channels`. Navbar shows "Alice".  
**Result:** ___  
**Screenshot:** *(screenshot of channels page with Alice shown in navbar)*

---

### TC-05 — Login with wrong password is rejected

**Feature:** Part 2 — Security  
**Steps:**
1. Go to `http://localhost:3000/login`
2. Enter Display Name: `Alice`
3. Enter Password: `wrongpassword`
4. Click **Sign In**

**Expected:** Error message: "Invalid credentials". Stay on login page.  
**Result:** ___  
**Screenshot:** *(screenshot of error message)*

---

### TC-06 — Unauthenticated user cannot create a post (redirect enforced)

**Feature:** Part 2 — Auth enforcement  
**Steps:**
1. Sign out (or open a fresh private/incognito window)
2. Navigate to `http://localhost:3000/channels/1/new-post`

**Expected:** Immediately redirected to `/login`.  
**Result:** ___  
**Screenshot:** *(screenshot showing redirect to login page)*

---

### TC-07 — Authenticated user creates a channel

**Feature:** Part 1 — Channels  
**Steps:**
1. Sign in as `Alice` / `password123`
2. Go to `http://localhost:3000/channels`
3. Fill in Channel Name: `python`
4. Fill in Description: `Python questions`
5. Click **Create Channel**

**Expected:** New "python" channel appears in the channel list.  
**Result:** ___  
**Screenshot:** *(screenshot of channel list showing new channel)*

---

### TC-08 — Authenticated user creates a post with a screenshot attachment

**Feature:** Part 1 — Posts + uploads  
**Steps:**
1. Sign in as `Alice`
2. Go to `http://localhost:3000/channels` → click any channel → "New Post"
3. Fill Title: `Test post with image`
4. Fill Body: `This post has an attached screenshot.`
5. Choose a `.png` or `.jpg` file (any small image from your computer)
6. Click **Post**

**Expected:** Redirected to the new post's page. The uploaded image is displayed below the post body.  
**Result:** ___  
**Screenshot:** *(screenshot of post page showing the image rendered)*

---

### TC-09 — File upload rejects non-image file

**Feature:** Part 1 — Upload validation  
**Steps:**
1. Sign in as `Alice`
2. Go to New Post form
3. In the file input, select a `.pdf` or `.txt` file

**Expected:** Inline error message: "Only PNG, JPEG, and WebP images are allowed". Submit button is disabled.  
**Result:** ___  
**Screenshot:** *(screenshot of file error message)*

---

### TC-10 — Reply to a post

**Feature:** Part 1 — Replies  
**Steps:**
1. Sign in as `Bob` / `password123`
2. Navigate to any post (e.g. `http://localhost:3000/posts/2`)
3. Type a reply in the reply form
4. Click **Post Reply**

**Expected:** Reply appears in the replies section with Bob's display name.  
**Result:** ___  
**Screenshot:** *(screenshot of post page showing the new reply)*

---

### TC-11 — Nested reply (reply to a reply)

**Feature:** Part 3 — Threaded replies  
**Steps:**
1. Sign in as `Alice`
2. Navigate to a post that has at least one reply
3. Click the **Reply** link on an existing reply (not the post-level form)
4. A "Replying to Bob" banner should appear above the form
5. Type a reply body and submit

**Expected:** The new reply appears indented under the reply it was targeted at (threaded view).  
**Result:** ___  
**Screenshot:** *(screenshot showing the indented nested reply)*

---

### TC-12 — Vote on a post (upvote)

**Feature:** Part 3 — Voting  
**Steps:**
1. Sign in as `Alice`
2. Navigate to any post
3. Click the **▲ Up** button on the post

**Expected:** Vote count updates (net score increases by 1). Button highlights to show active vote.  
**Result:** ___  
**Screenshot:** *(screenshot of vote buttons showing updated score)*

---

### TC-13 — Change vote (up → down)

**Feature:** Part 3 — Voting rules  
**Steps:**
1. As `Alice` (who just upvoted in TC-12)
2. Click the **▼ Down** button on the same post

**Expected:** Score decreases by 2 (removed +1, applied −1). Down button highlights.  
**Result:** ___  
**Screenshot:** *(screenshot showing changed vote score)*

---

### TC-14 — Remove vote (return to neutral)

**Feature:** Part 3 — Voting rules  
**Steps:**
1. As `Alice` (who downvoted in TC-13)
2. Click the **▼ Down** button again (same button)

**Expected:** Vote is removed. Score returns to 0 (or previous). Neither button is highlighted.  
**Result:** ___  
**Screenshot:** *(screenshot showing neutral/no vote state)*

---

### TC-15 — Search: keyword across posts and replies

**Feature:** Part 4 — Search  
**Steps:**
1. Go to `http://localhost:3000/search`
2. Select **"1. Keyword — search posts & replies"**
3. Enter keyword: `async`
4. Click **Search**

**Expected:** Results list shows posts and/or replies containing "async". Each result has a "View post →" link.  
**Result:** ___  
**Screenshot:** *(screenshot of search results for "async")*

---

### TC-16 — Search: content by a specific author

**Feature:** Part 4 — Search  
**Steps:**
1. Go to `http://localhost:3000/search`
2. Select **"2. By author — all content from a user"**
3. Enter author name: `Alice`
4. Click **Search**

**Expected:** Results show only posts and replies authored by Alice.  
**Result:** ___  
**Screenshot:** *(screenshot of author search results)*

---

### TC-17 — Search: top-voted posts

**Feature:** Part 4 — Search (ranking)  
**Steps:**
1. Go to `http://localhost:3000/search`
2. Select **"5. Top-voted posts"**
3. Click **Search** (no keyword needed)

**Expected:** Posts listed in descending order of net score. Score shown on each card (e.g. "+2 pts").  
**Result:** ___  
**Screenshot:** *(screenshot of top-voted results)*

---

### TC-18 — Admin: login and access admin panel

**Feature:** Part 2 — Admin  
**Steps:**
1. Sign in as `admin` / `admin123`
2. Click **Admin** in the navbar (or go to `http://localhost:3000/admin`)

**Expected:** Admin panel loads with tabs for Users, Channels, Posts, Replies.  
**Result:** ___  
**Screenshot:** *(screenshot of admin panel)*

---

### TC-19 — Admin: delete a post

**Feature:** Part 2 — Admin moderation  
**Steps:**
1. Sign in as `admin`
2. Go to `http://localhost:3000/admin` → **Posts** tab
3. Click **Delete** next to any post
4. Confirm the dialog

**Expected:** Post is removed from the list. Navigating to that post's URL returns an error/not-found state.  
**Result:** ___  
**Screenshot:** *(screenshot of posts tab after deletion)*

---

### TC-20 — Non-admin cannot access admin panel

**Feature:** Part 2 — Access control  
**Steps:**
1. Sign in as `Alice` (role = user)
2. Navigate to `http://localhost:3000/admin`

**Expected:** Redirected to `/login` (middleware blocks the route). No admin panel shown.  
**Result:** ___  
**Screenshot:** *(screenshot showing redirect to login page)*

---

## Summary Table

| ID | Test Case | Result |
|----|-----------|--------|
| TC-01 | Landing page loads | |
| TC-02 | Register new account | |
| TC-03 | Duplicate name rejected | |
| TC-04 | Login — valid credentials | |
| TC-05 | Login — wrong password rejected | |
| TC-06 | Unauthenticated user redirected from new-post | |
| TC-07 | Create channel (authenticated) | |
| TC-08 | Create post with image attachment | |
| TC-09 | Upload non-image file rejected | |
| TC-10 | Reply to a post | |
| TC-11 | Nested reply (reply to reply) | |
| TC-12 | Upvote a post | |
| TC-13 | Change vote (up → down) | |
| TC-14 | Remove vote (neutral) | |
| TC-15 | Search: keyword | |
| TC-16 | Search: by author | |
| TC-17 | Search: top-voted | |
| TC-18 | Admin login + panel access | |
| TC-19 | Admin deletes a post | |
| TC-20 | Non-admin blocked from admin panel | |

**Total: 20 / 20 passed** *(update this after testing)*

---

*All tests performed against a fresh Docker build: `docker-compose down -v && docker-compose up --build`*
