
function Footer() {
  return (
    <footer className="w-full text-muted-foreground text-sm">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between space-y-4 px-4 py-6 sm:flex-row sm:space-y-0 sm:px-6 lg:px-8"> 
        <p>&copy;{new Date().getFullYear()} <a href="https://zopkit.com" target="_blank" className="text-blue-700 hover:text-blue-950">Zopkit</a>. All rights reserved.</p>
        <div className="flex space-x-4">
          <a href="/privacy" className="hover:underline">Privacy Policy</a>
          <a href="/terms" className="hover:underline">Terms of Service</a>
          <a href="/contact" className="hover:underline">Contact Us</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
