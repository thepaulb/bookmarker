# URL bookmarking tool

I want to build a service similar to the new defunct [getpocket.com](http://getpocket.com). This service will allow you to bookmark web pages for future reference.  
The application will be built with Responsive Web Design Principles.

## Users

The app will support multiple users for the start. Users will authenticate with Username/password.

## User Stories

Users can:

1. As a user I can login to the application to see a list of my most recent bookmarks  
   1. The service will display a list of the 50 most recent bookmarks  
   2. The bookmarks will be presented in reverse chronological order   
   3. Each bookmark will contain the following fields:  
      1. 

| Field | Description |
| :---- | :---- |
| Title | The title of the bookmark, a clickable link |
| Date | The date the bookmark was created |
| Tag(s) | List of tags associated with the bookmark |
| Description | A brief description of the bookmark |

      

2. As a user I can click on a bookmark to visit the source web page of the bookmark  
   1. The link text will be the title of the bookmark page  
   2. Clicking on the link will open the source page in a new browser tab

   

3. As a user I can see related metadata about the bookmark  
   1. This will include:  
      1. The date the bookmark was created  
      2. A list of tags associated with the bookmark

   

4. As a user I can add a new bookmark by clicking on a ‘Add’ button at the top of the page  
   1. This will open a new page with the URL: /addbookmark  
   2. The new page will contain a form to create the bookmark with the following fields;  
      1. 

| Title | Type | Description |
| :---- | :---- | :---- |
| URL | Text input | The URL of the page to bookmark |
| Tags | Select element | Optional. The select element will contain a list of available tags to associate with a bookmark. The element will allow multiple tags to be selected. |

   3. When the form is posted the backend will create the bookmark and add it to the database add the create created

5. As a user I can delete a bookmark  
   1. The individual bookmark will have a button that when clicked will delete the bookmark both on the front and backend of the application

6. As a user I can search the application for a bookmark  
   1. This will match the search query against:  
      1. The title field  
      2. The URL field  
      3. Associated Tags  
   2. Search results will be displayed on a new page with the URL: /results  
   3. The matching results will display as a list with the same fields as on the home page  
        
7. As a user I can see a list of all the tags used in the service  
   1. The homepage will display a link at the top of the page linking to the following URL: /tags  
   2. This page will display a click-able list of all the tags used in the application

   

8. As a user I can see a list bookmarks associated with a tag  
   1. Clicking on a specific tag on the tags page will open up a new page with the URL /tags/\<tag\_name\> tag\_name being the name of the clicked tag  
   2. The new page will display a list of all the bookmarks associated with the selected tag

## Data

The seed data for this application can be found in my export from [Pocket.com](http://Pocket.com) /Pocket Export/part\_000000.csv i have an additional set of bookmarks that will need adding to this at some point.

## Testing

I want comprehensive unit tests using the vitetest framework.

## Technology Stack

The tech stack will be as per the workout tracker: React, ExpressJS, SQLite, Vite. See: Architecture/Workout Tracker — Architecture.pdf