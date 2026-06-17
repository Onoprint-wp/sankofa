// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SankofaCertificates
 * @dev Enregistre les empreintes cryptographiques (hashs) des certificats d'authenticité
 * des œuvres d'art acquises sur la marketplace SANKOFA, garantissant leur immutabilité.
 */
contract SankofaCertificates {
    
    // Adresse de l'administrateur de la plateforme SANKOFA
    address public owner;

    // Événement déclenché à chaque enregistrement de certificat
    event CertificateRegistered(
        string indexed certificateId,
        bytes32 indexed metadataHash,
        string metadataURI
    );

    // Modificateur limitant l'accès au propriétaire
    modifier onlyOwner() {
        require(msg.sender == owner, "Seul le proprietaire peut executer cette action");
        _;
    }

    /**
     * @dev Constructeur définissant le créateur comme propriétaire
     */
    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Enregistre un certificat d'authenticité sur la blockchain
     * @param certificateId Identifiant unique UUID du certificat sous forme de chaîne
     * @param metadataHash Hash SHA-256 de l'objet de métadonnées complet du certificat
     * @param metadataURI URI (lien Supabase Storage public) vers le fichier JSON complet des métadonnées
     */
    function registerCertificate(
        string calldata certificateId,
        bytes32 metadataHash,
        string calldata metadataURI
    ) external onlyOwner {
        emit CertificateRegistered(certificateId, metadataHash, metadataURI);
    }

    /**
     * @dev Permet de transférer la propriété du contrat
     * @param newOwner Adresse du nouveau propriétaire
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Adresse invalide");
        owner = newOwner;
    }
}
