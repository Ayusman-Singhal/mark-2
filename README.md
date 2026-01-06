# Electron Sidebar Application

A simple and clean Electron desktop application featuring a side navigation bar with multiple pages.

## Features

- 🚀 Cross-platform desktop application built with Electron
- 📱 Responsive sidebar navigation
- 🎨 Modern and clean user interface
- 🔄 Dynamic page content switching
- 💫 Smooth animations and transitions

## Pages Included

- **Home** - Welcome page with feature overview
- **Dashboard** - Analytics and reports section
- **Profile** - User profile management
- **Settings** - Application configuration
- **About** - Information about the application

## Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)

## Installation

1. Clone or download this repository
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

### Development Mode
To run the application in development mode (with DevTools):
```bash
npm run dev
```

### Production Mode
To run the application in production mode:
```bash
npm start
```

## Project Structure

```
├── main.js              # Main Electron process
├── index.html           # Main HTML file
├── styles.css           # Application styles
├── renderer.js          # Main renderer process and page manager
├── pages/               # Modular page components
│   ├── home.js          # Home page module
│   ├── dashboard.js     # Dashboard page module
│   ├── profile.js       # Profile page module
│   ├── settings.js      # Settings page module
│   └── about.js         # About page module
├── package.json         # Project configuration
└── README.md            # This file
```

## Customization

### Adding New Pages

The application now uses a modular page system. To add a new page:

1. Create a new JavaScript file in the `pages/` directory (e.g., `pages/newpage.js`):
```javascript
const NewPage = {
    title: "New Page",
    
    getContent: () => {
        return `<div>Your new page content here</div>`;
    },
    
    init: () => {
        console.log('New page initialized');
        // Add page-specific initialization here
    },
    
    cleanup: () => {
        console.log('New page cleanup');
        // Clean up page-specific resources here
    }
};

// Export the page module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NewPage;
} else {
    window.NewPage = NewPage;
}
```

2. Add a new navigation item in `index.html`:
```html
<li class="nav-item">
    <a href="#" data-page="newpage" class="nav-link">
        <span class="nav-icon">🆕</span>
        <span class="nav-text">New Page</span>
    </a>
</li>
```

3. Include the script in `index.html`:
```html
<script src="pages/newpage.js"></script>
```

4. Register the page in `renderer.js`:
```javascript
pages: {
    // ... existing pages
    newpage: NewPage
}
```

### Page Module Structure

Each page module should follow this structure:
- **title**: The page title displayed in the header
- **getContent()**: Returns the HTML content for the page
- **init()**: Called when the page is loaded (optional)
- **cleanup()**: Called when leaving the page (optional)
- **Custom methods**: Any page-specific functionality

### Styling

Modify `styles.css` to customize the appearance:
- Change colors in the CSS custom properties
- Adjust sidebar width
- Modify card layouts
- Update typography

## Building for Distribution

To package the application for distribution, you'll need to add electron-builder or electron-packager:

```bash
npm install --save-dev electron-builder
```

Then add build scripts to `package.json` and configure for your target platforms.

## Technologies Used

- **Electron** - Desktop application framework
- **HTML5** - Markup structure
- **CSS3** - Styling and animations
- **JavaScript** - Application logic

## License

MIT License - feel free to use this project as a starting point for your own applications.

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.
