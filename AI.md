# AI architecture

The web client calls capability endpoints rather than a model directly. The local provider supplies material classification and fair-price estimation; matching, anomaly, discrepancy and safety decisions are pure services.

The demo classifier is deterministic from supplied metadata. It is visibly labelled **AI DEMO MODEL** and does not claim validated accuracy. A production provider can implement the same contracts with an on-device TFLite/ONNX classifier, monitored price forecasting and a versioned evaluation dataset.
