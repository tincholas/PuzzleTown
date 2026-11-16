import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let woodBgColor = UIColor(red: 223.0 / 255.0, green: 184.0 / 255.0, blue: 136.0 / 255.0, alpha: 1.0)
        let bridgeVC = CAPBridgeViewController()
        bridgeVC.view.backgroundColor = woodBgColor
        bridgeVC.webView?.isOpaque = false
        bridgeVC.webView?.backgroundColor = woodBgColor
        bridgeVC.webView?.scrollView.backgroundColor = woodBgColor

        window = UIWindow(windowScene: windowScene)
        window?.backgroundColor = woodBgColor
        window?.rootViewController = bridgeVC
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
