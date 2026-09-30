"""
Export a pre-trained Deep Neural Network directly to TensorFlow.js format.
Produces:
  - models/model.json
  - models/group1-shard1of1.bin
This allows instant startup without 20 epochs of client-side browser training!
"""

import os
import json
import struct
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

DATASET_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "keypoint.csv")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "models")


class ASLNet(nn.Module):
    def __init__(self, input_dim=42, num_classes=26):
        super(ASLNet, self).__init__()
        self.fc1 = nn.Linear(input_dim, 256)
        self.relu1 = nn.ReLU()
        self.fc2 = nn.Linear(256, 128)
        self.relu2 = nn.ReLU()
        self.fc3 = nn.Linear(128, 64)
        self.relu3 = nn.ReLU()
        self.fc4 = nn.Linear(64, num_classes)

    def forward(self, x):
        x = self.relu1(self.fc1(x))
        x = self.relu2(self.fc2(x))
        x = self.relu3(self.fc3(x))
        return self.fc4(x)


def load_dataset():
    print(f"[*] Loading dataset from {DATASET_PATH}...")
    xs = []
    ys = []
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        for line in f:
            row = line.strip()
            if not row:
                continue
            parts = [float(p.strip()) for p in row.split(",")]
            label = int(parts[0])
            features = parts[1:]
            if len(features) == 42 and 0 <= label < 26:
                xs.append(features)
                ys.append(label)

    X = torch.tensor(xs, dtype=torch.float32)
    Y = torch.tensor(ys, dtype=torch.long)
    print(f"[+] Loaded {len(X)} samples across 26 classes.")
    return X, Y


def train_and_export():
    X, Y = load_dataset()
    dataset = TensorDataset(X, Y)
    loader = DataLoader(dataset, batch_size=256, shuffle=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[*] Training on device: {device}...")

    model = ASLNet().to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.002)

    epochs = 15
    for epoch in range(epochs):
        total_loss = 0.0
        correct = 0
        total = 0
        model.train()
        for batch_x, batch_y in loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            optimizer.zero_grad()
            outputs = model(batch_x)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()

            total_loss += loss.item() * len(batch_y)
            _, predicted = torch.max(outputs, 1)
            correct += (predicted == batch_y).sum().item()
            total += len(batch_y)

        acc = (correct / total) * 100
        avg_loss = total_loss / total
        print(f"    Epoch {epoch+1:02d}/{epochs:02d} - Loss: {avg_loss:.4f} - Accuracy: {acc:.2f}%")

    model.eval()
    model.to("cpu")

    # Serialize weights in TensorFlow.js format
    # In TF.js, Dense layer weights are [kernel (input_dim, output_dim), bias (output_dim)]
    # PyTorch linear weights are [weight (out_features, in_features), bias (out_features)]
    # Transpose PyTorch weights to match TF.js kernel shape!
    weights_info = []
    weight_buffers = bytearray()

    layers_mapping = [
        ("dense_Dense1", model.fc1, 42, 256),
        ("dense_Dense2", model.fc2, 256, 128),
        ("dense_Dense3", model.fc3, 128, 64),
        ("dense_Dense4", model.fc4, 64, 26),
    ]

    for name, layer, in_f, out_f in layers_mapping:
        # Kernel: (in_f, out_f)
        kernel_np = layer.weight.detach().cpu().numpy().T.astype(np.float32)
        assert kernel_np.shape == (in_f, out_f)
        kernel_bytes = kernel_np.tobytes()
        weights_info.append({
            "name": f"{name}/kernel",
            "shape": [in_f, out_f],
            "dtype": "float32"
        })
        weight_buffers.extend(kernel_bytes)

        # Bias: (out_f,)
        bias_np = layer.bias.detach().cpu().numpy().astype(np.float32)
        assert bias_np.shape == (out_f,)
        bias_bytes = bias_np.tobytes()
        weights_info.append({
            "name": f"{name}/bias",
            "shape": [out_f],
            "dtype": "float32"
        })
        weight_buffers.extend(bias_bytes)

    shard_filename = "group1-shard1of1.bin"
    shard_path = os.path.join(OUTPUT_DIR, shard_filename)
    with open(shard_path, "wb") as f:
        f.write(weight_buffers)
    print(f"[+] Saved weight shard: {shard_path} ({len(weight_buffers)} bytes)")

    # TF.js Model Topology JSON
    tfjs_model = {
        "format": "layers-model",
        "generatedBy": "Antigravity PyTorch Exporter v1.0",
        "convertedBy": "PyTorch-to-TFJS custom pipeline",
        "modelTopology": {
            "class_name": "Sequential",
            "config": {
                "name": "sequential_asl",
                "layers": [
                    {
                        "class_name": "Dense",
                        "config": {
                            "name": "dense_Dense1",
                            "trainable": True,
                            "batch_input_shape": [None, 42],
                            "dtype": "float32",
                            "units": 256,
                            "activation": "relu",
                            "use_bias": True
                        }
                    },
                    {
                        "class_name": "Dense",
                        "config": {
                            "name": "dense_Dense2",
                            "trainable": True,
                            "dtype": "float32",
                            "units": 128,
                            "activation": "relu",
                            "use_bias": True
                        }
                    },
                    {
                        "class_name": "Dense",
                        "config": {
                            "name": "dense_Dense3",
                            "trainable": True,
                            "dtype": "float32",
                            "units": 64,
                            "activation": "relu",
                            "use_bias": True
                        }
                    },
                    {
                        "class_name": "Dense",
                        "config": {
                            "name": "dense_Dense4",
                            "trainable": True,
                            "dtype": "float32",
                            "units": 26,
                            "activation": "softmax",
                            "use_bias": True
                        }
                    }
                ]
            }
        },
        "weightsManifest": [
            {
                "paths": [shard_filename],
                "weights": weights_info
            }
        ]
    }

    model_json_path = os.path.join(OUTPUT_DIR, "model.json")
    with open(model_json_path, "w", encoding="utf-8") as f:
        json.dump(tfjs_model, f, indent=2)
    print(f"[+] Saved model.json: {model_json_path}")
    print("[OK] TF.js offline model export complete! The web app will now load instantly.")


if __name__ == "__main__":
    train_and_export()
