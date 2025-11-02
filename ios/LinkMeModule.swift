import Foundation
import React
import LinkMeKit

@objc(LinkMeModule)
class LinkMeModule: RCTEventEmitter {
  
  private var linkListenerRemover: (() -> Void)?
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  override func supportedEvents() -> [String]! {
    return ["link"]
  }
  
  @objc
  func configure(_ config: NSDictionary, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    NSLog("[LinkMeModule] configure called")
    guard let baseUrlString = config["baseUrl"] as? String,
          URL(string: baseUrlString) != nil else {
      rejecter("INVALID_ARGS", "baseUrl is required", nil)
      return
    }

    LinkMeURLHandler.applyConfig(config)

    // Subscribe to LinkMe payloads and emit to React Native
    linkListenerRemover?.()
    linkListenerRemover = LinkMe.shared.addListener { [weak self] payload in
      guard let self = self else { return }
      let dict = self.dictionary(from: payload)
      NSLog("[LinkMeModule] Listener received payload, emitting to RN: %@", dict ?? "nil")
      self.sendEvent(withName: "link", body: dict)
    }
    NSLog("[LinkMeModule] Listener registered")

    resolver(nil)
  }
  
  deinit {
    linkListenerRemover?()
  }
  
  @objc
  func getInitialLink(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    NSLog("[LinkMeModule] getInitialLink called")
    LinkMe.shared.getInitialLink { payload in
      DispatchQueue.main.async {
        let dict = self.dictionary(from: payload)
        NSLog("[LinkMeModule] getInitialLink returning: %@", dict ?? "nil")
        resolver(dict)
      }
    }
  }
  
  @objc
  func claimDeferredIfAvailable(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    NSLog("[LinkMeModule] claimDeferredIfAvailable called")
    LinkMe.shared.claimDeferredIfAvailable { payload in
      DispatchQueue.main.async {
        let dict = self.dictionary(from: payload)
        NSLog("[LinkMeModule] claimDeferredIfAvailable returning: %@", dict ?? "nil")
        resolver(dict)
      }
    }
  }
  
  @objc
  func setUserId(_ userId: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    LinkMe.shared.setUserId(userId)
    resolver(nil)
  }
  
  @objc
  func setAdvertisingConsent(_ granted: Bool, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    LinkMe.shared.setAdvertisingConsent(granted)
    resolver(nil)
  }
  
  @objc
  func track(_ event: String, properties: NSDictionary?, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    let props = properties as? [String: Any]
    LinkMe.shared.track(event: event, props: props)
    resolver(nil)
  }
  
  @objc
  func setReady(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    LinkMe.shared.setReady()
    resolver(nil)
  }
  
  @objc
  func handleUrl(_ url: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let url = URL(string: url) else {
      rejecter("INVALID_URL", "Invalid URL format", nil)
      return
    }
    
    #if DEBUG
    NSLog("[LinkMeModule] handleUrl url=%@", url.absoluteString)
    #endif
    
    // Handle the URL - this will process it asynchronously and emit via listener
    let handled = LinkMe.shared.handle(url: url)
    
    // Return true if the URL was accepted for processing
    resolver(handled)
  }
  
  private func dictionary(from payload: LinkPayload?) -> [String: Any]? {
    guard let payload else { return nil }
    var dict: [String: Any] = [:]
    if let linkId = payload.linkId { dict["linkId"] = linkId }
    if let path = payload.path { dict["path"] = path }
    if let params = payload.params { dict["params"] = params }
    if let utm = payload.utm { dict["utm"] = utm }
    if let custom = payload.custom { dict["custom"] = custom }
    return dict
  }
}
