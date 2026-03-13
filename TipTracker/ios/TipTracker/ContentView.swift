import SwiftUI
import WebKit

struct ContentView: View {
    var body: some View {
        WebView()
            .ignoresSafeArea()
            .statusBarHidden(false)
    }
}

struct WebView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true

        // Enable localStorage and sessionStorage
        config.websiteDataStore = .default()
        config.preferences.javaScriptCanOpenWindowsAutomatically = false

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 18/255, green: 18/255, blue: 24/255, alpha: 1)
        webView.scrollView.backgroundColor = UIColor(red: 18/255, green: 18/255, blue: 24/255, alpha: 1)

        // Disable bounce scrolling (the app handles its own scrolling)
        webView.scrollView.bounces = false
        webView.scrollView.alwaysBounceVertical = false
        webView.scrollView.alwaysBounceHorizontal = false

        // Allow back/forward swipe navigation
        webView.allowsBackForwardNavigationGestures = false

        // Set navigation delegate
        webView.navigationDelegate = context.coordinator

        // Load the bundled web app
        if let indexURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") {
            let webDir = indexURL.deletingLastPathComponent()
            webView.loadFileURL(indexURL, allowingReadAccessTo: webDir)
        }

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            // Open external links in Safari, keep internal navigation in the web view
            if let url = navigationAction.request.url {
                if url.scheme == "file" || url.scheme == "about" {
                    decisionHandler(.allow)
                } else if url.scheme == "http" || url.scheme == "https" {
                    UIApplication.shared.open(url)
                    decisionHandler(.cancel)
                } else {
                    decisionHandler(.allow)
                }
            } else {
                decisionHandler(.allow)
            }
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            // Inject CSS to ensure safe area handling and prevent text selection issues
            let css = """
            body {
                -webkit-user-select: none;
                -webkit-touch-callout: none;
                overscroll-behavior: none;
            }
            input, textarea {
                -webkit-user-select: auto;
                -webkit-touch-callout: default;
            }
            """
            let js = """
            var style = document.createElement('style');
            style.textContent = `\(css)`;
            document.head.appendChild(style);
            """
            webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }
}

#Preview {
    ContentView()
}
