"""
StackLens AI - Advanced Deep Learning Models
Custom neural network implementations for enhanced error pattern detection
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import BertModel, BertTokenizer
import numpy as np
from typing import Dict, List, Tuple, Optional

class StackLensTransformer(nn.Module):
    """
    Custom BERT-based transformer for error semantic understanding
    Specialized for log analysis with technical vocabulary
    """
    
    def __init__(self, config):
        super().__init__()
        self.config = config
        
        # Load pre-trained BERT and customize
        self.bert = BertModel.from_pretrained('bert-base-uncased')
        
        # Add technical vocabulary embeddings
        self.tech_vocab_embeddings = nn.Embedding(5000, 768)  # Technical terms
        
        # Multi-head error classification
        self.severity_classifier = nn.Linear(768, 4)  # critical, high, medium, low
        self.category_classifier = nn.Linear(768, 10)  # error categories
        self.confidence_estimator = nn.Linear(768, 1)  # confidence score
        
        # Attention for important tokens
        self.error_attention = nn.MultiheadAttention(768, 12)
        
        self.dropout = nn.Dropout(0.1)
        
    def forward(self, input_ids, attention_mask=None, token_type_ids=None):
        # Get BERT embeddings
        outputs = self.bert(input_ids, attention_mask=attention_mask, token_type_ids=token_type_ids)
        sequence_output = outputs.last_hidden_state
        pooled_output = outputs.pooler_output
        
        # Apply error-specific attention
        attended_output, attention_weights = self.error_attention(
            sequence_output.transpose(0, 1),
            sequence_output.transpose(0, 1),
            sequence_output.transpose(0, 1)
        )
        
        # Global representation
        global_repr = attended_output.mean(dim=0)
        
        # Multi-task predictions
        severity_logits = self.severity_classifier(self.dropout(global_repr))
        category_logits = self.category_classifier(self.dropout(global_repr))
        confidence = torch.sigmoid(self.confidence_estimator(self.dropout(global_repr)))
        
        return {
            'severity_logits': severity_logits,
            'category_logits': category_logits,
            'confidence': confidence,
            'embeddings': global_repr,
            'attention_weights': attention_weights
        }

class ErrorFlowLSTM(nn.Module):
    """
    Bidirectional LSTM for temporal error pattern detection
    Predicts error sequences and cascading failures
    """
    
    def __init__(self, input_size=512, hidden_size=256, num_layers=3, num_classes=4):
        super().__init__()
        
        # Bidirectional LSTM layers
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=0.2
        )
        
        # Attention mechanism for important time steps
        self.attention = nn.Sequential(
            nn.Linear(hidden_size * 2, hidden_size),
            nn.Tanh(),
            nn.Linear(hidden_size, 1)
        )
        
        # Classification layers
        self.classifier = nn.Sequential(
            nn.Linear(hidden_size * 2, hidden_size),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(hidden_size, num_classes)
        )
        
        # Sequence prediction head
        self.sequence_predictor = nn.Linear(hidden_size * 2, input_size)
        
    def forward(self, x, hidden=None):
        # x shape: (batch, sequence_length, input_size)
        batch_size, seq_len, _ = x.size()
        
        # LSTM forward pass
        lstm_out, (hidden, cell) = self.lstm(x, hidden)
        
        # Attention mechanism
        attention_weights = self.attention(lstm_out)  # (batch, seq_len, 1)
        attention_weights = F.softmax(attention_weights, dim=1)
        
        # Weighted representation
        attended_output = torch.sum(lstm_out * attention_weights, dim=1)  # (batch, hidden_size*2)
        
        # Classification
        class_logits = self.classifier(attended_output)
        
        # Next sequence prediction
        next_sequence = self.sequence_predictor(lstm_out[:, -1, :])
        
        return {
            'class_logits': class_logits,
            'next_sequence': next_sequence,
            'attention_weights': attention_weights.squeeze(-1),
            'hidden_states': lstm_out
        }

class SystemGraphGNN(nn.Module):
    """
    Graph Neural Network for system component relationship modeling
    Maps error propagation across microservices and dependencies
    """
    
    def __init__(self, node_features=128, edge_features=64, hidden_dim=256, num_layers=3):
        super().__init__()
        
        self.node_features = node_features
        self.edge_features = edge_features
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        
        # Node feature transformation
        self.node_embedding = nn.Linear(node_features, hidden_dim)
        
        # Edge feature transformation
        self.edge_embedding = nn.Linear(edge_features, hidden_dim)
        
        # Graph convolution layers
        self.conv_layers = nn.ModuleList([
            GraphConvLayer(hidden_dim, hidden_dim) for _ in range(num_layers)
        ])
        
        # Output layers
        self.node_classifier = nn.Linear(hidden_dim, 5)  # health status
        self.edge_predictor = nn.Linear(hidden_dim * 2, 1)  # error propagation probability
        self.global_pooling = nn.Linear(hidden_dim, 1)  # system health score
        
    def forward(self, node_features, edge_features, adjacency_matrix):
        batch_size, num_nodes, _ = node_features.size()
        
        # Embed node and edge features
        node_embed = F.relu(self.node_embedding(node_features))
        edge_embed = F.relu(self.edge_embedding(edge_features))
        
        # Graph convolution
        for conv_layer in self.conv_layers:
            node_embed = conv_layer(node_embed, edge_embed, adjacency_matrix)
        
        # Node-level predictions
        node_health = self.node_classifier(node_embed)
        
        # Edge-level predictions (error propagation)
        edge_predictions = []
        for i in range(num_nodes):
            for j in range(num_nodes):
                if adjacency_matrix[i, j] == 1:  # Connected nodes
                    edge_repr = torch.cat([node_embed[:, i, :], node_embed[:, j, :]], dim=-1)
                    edge_pred = torch.sigmoid(self.edge_predictor(edge_repr))
                    edge_predictions.append(edge_pred)
        
        # Global system health
        global_repr = torch.mean(node_embed, dim=1)  # Average pooling
        system_health = torch.sigmoid(self.global_pooling(global_repr))
        
        return {
            'node_health': node_health,
            'edge_propagation': edge_predictions,
            'system_health': system_health,
            'node_embeddings': node_embed
        }

class GraphConvLayer(nn.Module):
    """Custom Graph Convolution Layer for SystemGraphGNN"""
    
    def __init__(self, in_features, out_features):
        super().__init__()
        self.linear = nn.Linear(in_features, out_features)
        self.activation = nn.ReLU()
        self.dropout = nn.Dropout(0.1)
        
    def forward(self, node_features, edge_features, adjacency_matrix):
        # Message passing
        messages = torch.matmul(adjacency_matrix.float(), node_features)
        
        # Apply linear transformation
        output = self.linear(messages)
        output = self.activation(output)
        output = self.dropout(output)
        
        # Residual connection
        if node_features.size(-1) == output.size(-1):
            output = output + node_features
            
        return output

class AnomalyVAE(nn.Module):
    """
    Variational Autoencoder for anomaly detection in log patterns
    Detects novel/unknown error patterns
    """
    
    def __init__(self, input_dim=1024, latent_dim=128, hidden_dims=[512, 256]):
        super().__init__()
        
        self.input_dim = input_dim
        self.latent_dim = latent_dim
        
        # Encoder
        encoder_layers = []
        prev_dim = input_dim
        for hidden_dim in hidden_dims:
            encoder_layers.extend([
                nn.Linear(prev_dim, hidden_dim),
                nn.ReLU(),
                nn.Dropout(0.2)
            ])
            prev_dim = hidden_dim
        
        self.encoder = nn.Sequential(*encoder_layers)
        
        # Latent space
        self.mu_layer = nn.Linear(hidden_dims[-1], latent_dim)
        self.logvar_layer = nn.Linear(hidden_dims[-1], latent_dim)
        
        # Decoder
        decoder_layers = []
        hidden_dims_reversed = [latent_dim] + hidden_dims[::-1] + [input_dim]
        for i in range(len(hidden_dims_reversed) - 1):
            decoder_layers.append(nn.Linear(hidden_dims_reversed[i], hidden_dims_reversed[i + 1]))
            if i < len(hidden_dims_reversed) - 2:  # No activation on final layer
                decoder_layers.extend([nn.ReLU(), nn.Dropout(0.2)])
        
        self.decoder = nn.Sequential(*decoder_layers)
        
    def encode(self, x):
        h = self.encoder(x)
        mu = self.mu_layer(h)
        logvar = self.logvar_layer(h)
        return mu, logvar
    
    def reparameterize(self, mu, logvar):
        std = torch.exp(0.5 * logvar)
        eps = torch.randn_like(std)
        return mu + eps * std
    
    def decode(self, z):
        return self.decoder(z)
    
    def forward(self, x):
        mu, logvar = self.encode(x)
        z = self.reparameterize(mu, logvar)
        reconstructed = self.decode(z)
        
        # Anomaly score (reconstruction error)
        anomaly_score = F.mse_loss(reconstructed, x, reduction='none').mean(dim=-1)
        
        return {
            'reconstructed': reconstructed,
            'mu': mu,
            'logvar': logvar,
            'z': z,
            'anomaly_score': anomaly_score
        }

class ResolutionDQN(nn.Module):
    """
    Deep Q-Network for optimal resolution suggestion learning
    Uses reinforcement learning to improve suggestion quality
    """
    
    def __init__(self, state_size=1024, action_size=100, hidden_layers=[512, 256, 128]):
        super().__init__()
        
        self.state_size = state_size
        self.action_size = action_size
        
        # Q-network layers
        layers = []
        prev_size = state_size
        for hidden_size in hidden_layers:
            layers.extend([
                nn.Linear(prev_size, hidden_size),
                nn.ReLU(),
                nn.Dropout(0.2)
            ])
            prev_size = hidden_size
        
        # Output layer (Q-values for each action)
        layers.append(nn.Linear(hidden_layers[-1], action_size))
        
        self.q_network = nn.Sequential(*layers)
        
        # Dueling DQN components
        self.value_stream = nn.Sequential(
            nn.Linear(hidden_layers[-1], 1)
        )
        
        self.advantage_stream = nn.Sequential(
            nn.Linear(hidden_layers[-1], action_size)
        )
        
    def forward(self, state):
        # Extract features
        features = self.q_network[:-1](state)  # All layers except final
        
        # Dueling DQN: Q(s,a) = V(s) + A(s,a) - mean(A(s,a))
        value = self.value_stream(features)
        advantage = self.advantage_stream(features)
        
        # Combine value and advantage
        q_values = value + advantage - advantage.mean(dim=-1, keepdim=True)
        
        return {
            'q_values': q_values,
            'value': value,
            'advantage': advantage
        }

# Training utilities and loss functions

class VAELoss(nn.Module):
    """Custom loss for Variational Autoencoder"""
    
    def __init__(self, beta=1.0):
        super().__init__()
        self.beta = beta
    
    def forward(self, reconstructed, original, mu, logvar):
        # Reconstruction loss
        recon_loss = F.mse_loss(reconstructed, original, reduction='sum')
        
        # KL divergence loss
        kl_loss = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp())
        
        # Total loss
        total_loss = recon_loss + self.beta * kl_loss
        
        return total_loss, recon_loss, kl_loss

class MultiTaskLoss(nn.Module):
    """Multi-task loss for StackLens Transformer"""
    
    def __init__(self, severity_weight=1.0, category_weight=1.0, confidence_weight=0.5):
        super().__init__()
        self.severity_weight = severity_weight
        self.category_weight = category_weight
        self.confidence_weight = confidence_weight
        
        self.severity_loss = nn.CrossEntropyLoss()
        self.category_loss = nn.CrossEntropyLoss()
        self.confidence_loss = nn.MSELoss()
    
    def forward(self, predictions, targets):
        severity_loss = self.severity_loss(predictions['severity_logits'], targets['severity'])
        category_loss = self.category_loss(predictions['category_logits'], targets['category'])
        confidence_loss = self.confidence_loss(predictions['confidence'], targets['confidence'])
        
        total_loss = (
            self.severity_weight * severity_loss +
            self.category_weight * category_loss +
            self.confidence_weight * confidence_loss
        )
        
        return total_loss, {
            'severity_loss': severity_loss,
            'category_loss': category_loss,
            'confidence_loss': confidence_loss
        }
