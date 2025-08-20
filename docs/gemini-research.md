Architecting a High-Performance, Multi-Tenant Documentation Querying System with Bun and TypeScriptSection 1: System Foundations: Selecting the Core Technology StackThis section establishes the foundational layer of the Multi-tenant Content Platform (MCP), justifying the choice of the runtime and web framework. It presents a high-level architectural diagram to provide a clear roadmap for the subsequent, more detailed sections, ensuring that every component choice is deliberate, evidence-based, and aligned with the system's primary goals of performance, scalability, and developer efficiency.1.1. The Bun Runtime: A Paradigm Shift for High-Performance TypeScriptThe selection of a JavaScript runtime is the most fundamental architectural decision, profoundly impacting every subsequent aspect of the system, from raw performance and developer experience to ecosystem compatibility and deployment complexity. For the MCP, a system predicated on low-latency API responses and efficient data processing, the choice of runtime is not merely a preference but a critical engineering decision. Bun is selected as the runtime for this project, not as a simple replacement for Node.js, but as a holistic, all-in-one toolkit engineered from the ground up for the demands of modern, high-performance applications.1The rationale for this selection is multifaceted and rooted in Bun's core design goals:Performance: At its heart, Bun is architected for speed. It is written in Zig, a low-level systems programming language, and leverages JavaScriptCore (JSC), the highly optimized JavaScript engine developed by Apple for Safari.1 This combination results in dramatically reduced process startup times and superior runtime performance compared to traditional Node.js environments. For an API-driven system like the MCP, where request-response latency is a key performance indicator (KPI), fast startup times translate directly to a more responsive user experience and more efficient resource utilization, especially in serverless or containerized deployment scenarios.Integrated Tooling: Bun distinguishes itself by being a complete, cohesive toolkit. It ships as a single executable that includes a package manager, a test runner, and a bundler.1 This integrated approach significantly reduces the complexity of the development environment. It eliminates the need for a disparate collection of tools like npm/yarn, Jest, and esbuild/Webpack, each with its own configuration and potential for version conflicts. This unified developer experience (DX) streamlines the entire development lifecycle, from initial setup to testing and production bundling, allowing engineering teams to focus on business logic rather than toolchain management.First-Class TypeScript & JSX Support: A pivotal advantage of Bun is its native, out-of-the-box support for TypeScript and JSX.2 Bun's internal transpiler, written in native code, handles the conversion of .ts and .tsx files to vanilla JavaScript on the fly during execution.4 This obviates the need for separate, often slow, pre-compilation steps involving the TypeScript compiler (tsc) or loaders like ts-node. Furthermore, Bun's runtime respects configurations within tsconfig.json, including critical features like paths for module aliasing, ensuring a seamless and intuitive integration with established TypeScript development patterns.1 This native support simplifies both the development workflow and the production deployment process, as the same command (bun run) can be used in both environments without a separate build step.Comprehensive API Surface: Bun provides a versatile and modern API surface by implementing both Node.js-compatible APIs and Web-standard APIs.1 It offers native implementations of essential Node.js modules like fs and path, ensuring compatibility with a vast portion of the existing npm ecosystem.3 Simultaneously, it provides first-class support for Web-standard APIs such as fetch, Request, Response, and Blob.1 This dual compatibility is a strategic advantage, allowing the MCP to leverage the rich library of existing Node.js packages while also encouraging the use of modern, platform-agnostic code that can be more easily ported between server, browser, and edge environments.1.2. The Web Framework: A Deliberate Choice for Type-Safety and PerformanceWhile Bun's native Bun.serve function provides a highly performant HTTP server, a dedicated web framework is indispensable for building a structured, maintainable, and robust API. A framework provides essential abstractions for routing, request validation, middleware composition, and error handling. Within the Bun ecosystem, two primary contenders emerge: Hono and ElysiaJS.6 The selection between them represents a critical trade-off between established stability and cutting-edge, ecosystem-specific optimization.An analysis of the contenders reveals distinct philosophies:Hono is positioned as an "ultrafast" web framework that is notably runtime-agnostic, with support for Cloudflare Workers, Deno, and Bun.6 Its design philosophy is heavily influenced by the Express.js API, making it familiar to many developers. Hono's primary strengths are its stability, its adherence to web standards (such as the standard Request and Response objects), and its broad compatibility, which prevents vendor lock-in to a specific runtime.8 This makes Hono a conservative and reliable choice for projects that prioritize portability and a mature, feature-complete API.7ElysiaJS, in contrast, is explicitly designed and meticulously optimized for Bun.10 It aims to push the boundaries of developer experience, particularly in the realm of type safety. Its most compelling feature is its ability to provide automatic, end-to-end type safety with minimal boilerplate. Through advanced type inference and a powerful schema builder, Elysia ensures that types are consistent from the database to the API handler and even to the client-side, via its companion library, Eden.7 Architecturally, Elysia leverages static code analysis to generate highly optimized code on the fly, a technique that allows it to achieve exceptional performance benchmarks specifically on the Bun runtime.10For the MCP project, ElysiaJS is the recommended framework. This decision is based on a careful evaluation of the project's specific requirements. The MCP is a new, greenfield application where the complexity lies within its data processing pipeline, a domain where strong type safety is invaluable for preventing subtle bugs. Elysia's deep, symbiotic integration with Bun, its unparalleled automatic type safety, and its performance-first design make it uniquely suited for this task. While Hono's stability is commendable, Elysia's "modernity"—specifically its robust, built-in validation and type system—provides more direct value by reducing boilerplate code and mitigating the risk of runtime data errors.10 The potential risks associated with a "bleeding edge" framework are considered a worthwhile trade-off for the significant gains in developer productivity and application correctness afforded by its superior type system.The following table provides a structured comparison to further justify this architectural decision.FeatureElysiaJSHonoJustification & Key SourcesPerformance on BunExceptionally high; leverages static code analysis for Bun-specific optimizations, often matching Go/Rust frameworks in benchmarks.Very high; an ultrafast framework, but designed to be runtime-agnostic, so it may not leverage every Bun-specific optimization.Elysia's design philosophy is to be the most performant framework on Bun, making it the optimal choice for a Bun-native application. 10Type SafetyBest-in-class; automatic, end-to-end type inference from request to response. Provides a client library (Eden) for full-stack type safety without code generation.Strong; good TypeScript support and adheres to web standards. Requires more explicit typing compared to Elysia's automatic inference.For a data-intensive pipeline like the MCP, Elysia's automatic and end-to-end type safety is a critical feature for reducing bugs and improving maintainability. 7Developer Experience"Bleeding edge" DX focused on minimizing boilerplate and maximizing type inference. The syntax is concise and highly expressive.Mature and stable, similar to Express.js, making it very easy to adopt for developers with a Node.js background.Elysia's modern DX is tailored for greenfield projects that can fully embrace its conventions, leading to faster development of type-safe code. 7Ecosystem & MaturityNewer and more rapidly evolving. Has a smaller but very active community. Potential for encountering bugs is slightly higher.More mature and "feature complete." Can be considered a stable alternative to Express for modern runtimes.Hono's maturity makes it a safer choice, but the MCP's requirements are well within the scope of Elysia's stable feature set, making the DX and performance benefits more compelling. 7Core PhilosophyA highly opinionated framework designed to provide the ultimate performance and type-safe developer experience specifically for the Bun runtime.A minimalist, unopinionated, and runtime-agnostic framework that prioritizes web standards and portability across different JavaScript environments.The MCP is a Bun-first application, making Elysia's Bun-centric philosophy a direct architectural alignment, whereas Hono's agnosticism is a feature the project does not require. 8This deliberate pairing of Bun and ElysiaJS is not merely a selection of two high-performing tools; it is the adoption of a highly integrated and symbiotic stack. Bun provides the high-speed, TypeScript-native runtime that enables Elysia's advanced features, while Elysia provides the ergonomic, type-safe abstractions that make it possible to fully and safely harness Bun's power. This synergy results in a development environment where performance and safety are not competing concerns but are instead mutually reinforcing, a crucial characteristic for the successful implementation of the MCP.1.3. High-Level System ArchitectureTo establish a clear and consistent mental model for the entire system, a high-level architectural diagram is essential. This diagram serves as a visual roadmap, illustrating the flow of data and the interaction between the major components. The MCP architecture is divided into two primary pathways: the Ingestion Path and the Query Path.1. Ingestion Path: This pathway describes the process of taking raw documents and converting them into a queryable knowledge base. The flow is as follows:A client initiates an HTTP POST request to the server, uploading one or more documents (PDF, HTML, or TXT) intended for a specific documentation set.The HTTP Server (ElysiaJS) receives the request. Its routing layer directs the request to a dedicated File Upload Handler. This handler validates the request, including the documentationSetId provided in the URL path.The handler passes the raw file to a Document Parser, which selects the appropriate parsing strategy based on the file's MIME type. It extracts clean, unstructured text from the source document.The extracted text is then fed into a Text Splitter/Chunker. This component divides the long text into smaller, semantically coherent chunks, a critical step for effective retrieval.Each text chunk is then passed to an Embedding Model (e.g., an OpenAI model), which converts the text into a high-dimensional numerical vector, or "embedding."Finally, these embeddings, along with their original text content and associated metadata (including the crucial documentationSetId), are stored in a Vector Database.2. Query Path: This pathway describes the process of answering a user's question by leveraging the knowledge base created during ingestion. The flow is as follows:A client initiates an HTTP POST request to the server, submitting a natural language query targeted at a specific documentation set.The HTTP Server (ElysiaJS) receives the request and routes it to a dedicated Query Handler, which extracts the documentationSetId from the path and the user's query from the request body.The query handler first sends the user's query text to the Embedding Model to generate a query vector.It then queries the Vector Database. This is a two-stage query: it first performs a Metadata Filtered Search to isolate only the vectors associated with the specified documentationSetId, and then performs a semantic similarity search within that subset using the query vector.The database returns the most relevant document chunks (the "context").This context, along with the original user query, is formatted into a prompt and sent to a Large Language Model (LLM).The LLM generates a natural language answer based only on the provided context.The server sends this Formatted Response back to the client.This dual-path architecture clearly separates the offline, intensive process of indexing from the online, low-latency process of querying, forming the foundational pattern for the entire Retrieval-Augmented Generation (RAG) system.Section 2: The Ingestion Pipeline: From Raw Document to Vectorized KnowledgeThe ingestion pipeline is the core of the RAG system's "indexing" phase, responsible for transforming raw, unstructured documents into a structured, searchable, and semantically rich knowledge base.12 The quality and reliability of the entire MCP system are fundamentally dependent on the precision and robustness of this pipeline. A failure at any stage—be it in parsing, chunking, or embedding—will inevitably lead to degraded retrieval performance and inaccurate responses. This section provides a detailed, practical guide to constructing each component of this critical pipeline.2.1. Building a Robust File Upload API with ElysiaJSThe entry point for all new knowledge into the MCP is a secure and validated file upload endpoint. This endpoint must be capable of handling multipart/form-data requests, validating the incoming files, and associating them with a specific documentationSetId. ElysiaJS, with its powerful built-in validation system, is ideally suited for this task.The API endpoint will be defined as POST /upload/{documentationSetId}. The documentationSetId serves as a path parameter, providing a clear and RESTful way to scope the uploaded documents. Elysia's validation schema, powered by TypeBox, will be used to enforce the structure of the incoming request at runtime, providing immediate feedback for invalid requests and ensuring type safety within the handler. The schema will specify that the request body must contain one or more files, using the t.File and t.Files types.13 This validation automatically handles content-type checking and ensures that the uploaded data is indeed a file.The implementation of this endpoint is as follows:TypeScriptimport { Elysia, t } from 'elysia';
import { processAndStoreDocument } from './processing'; // Assumes processing logic is modularized

const app = new Elysia()
.post(
'/upload/:documentationSetId',
async ({ params, body, set }) => {
const { documentationSetId } = params;
const { files } = body;

      // The 'files' property can be a single File or an array of Files.
      // We normalize it to an array for consistent processing.
      const fileArray = Array.isArray(files)? files : [files];

      try {
        for (const file of fileArray) {
          // BunFile extends Blob and is compatible with what Elysia provides
          await processAndStoreDocument(file as unknown as BunFile, documentationSetId);
        }

        set.status = 202; // Accepted
        return {
          message: `${fileArray.length} file(s) accepted for processing for documentation set: ${documentationSetId}`,
        };
      } catch (error) {
        console.error(`Error processing upload for ${documentationSetId}:`, error);
        set.status = 500;
        return { error: 'Failed to process one or more files.' };
      }
    },
    {
      // Elysia's validation schema for the request.
      // This ensures the body contains a 'files' field which is either a single file
      // or an array of files. It also validates the path parameter.
      params: t.Object({
        documentationSetId: t.String({
          minLength: 1,
          description: 'The unique identifier for the documentation set.'
        }),
      }),
      body: t.Object({
        files: t.Files({
          // Optional: Add constraints like max size or specific MIME types
          // e.g., type: ['application/pdf', 'text/html', 'text/plain']
        }),
      }),
    }

);

//... server setup...
In this implementation, Elysia's validation layer acts as a powerful guard, ensuring that the handler logic only executes with well-formed requests. The handler receives the validated documentationSetId and the file(s) (as Blob-like objects) and passes them to the next stage of the pipeline, which will be handled by Bun's efficient file I/O capabilities.152.2. A Unified Strategy for Multi-Format ParsingThe MCP must be able to ingest documents in various formats: PDF, HTML, and plain text. Each format requires a specialized parsing strategy to extract clean, meaningful text content while discarding irrelevant structural information or formatting. A unified approach that abstracts these format-specific parsers behind a common interface is essential for a maintainable and extensible system.PDF Parsing with unpdf:For parsing PDF documents, the unpdf library is the recommended choice. Unlike older, unmaintained libraries such as pdf-parse which are noted for potential bugs and memory leaks, unpdf is a modern library specifically designed for serverless and edge environments like Bun.17 It has zero dependencies, which aligns with the goal of a lean and fast application, and it provides a clean, promise-based API that integrates seamlessly with modern asynchronous TypeScript code.17 Its core is built upon a serverless-optimized distribution of Mozilla's robust PDF.js library, ensuring high-quality text extraction.The implementation for a PDF parser using unpdf is straightforward:TypeScriptimport { extractText } from 'unpdf';

export async function parsePdf(file: BunFile): Promise<string> {
const pdfBuffer = await file.arrayBuffer();
// unpdf's extractText can work with a buffer
const { text } = await extractText(pdfBuffer);
return text;
}
HTML Parsing with Bun's HTMLRewriter:For HTML documents, the most performant option is to use Bun's native HTMLRewriter API.19 This API is built directly into the Bun runtime in native code, making it significantly faster than third-party JavaScript-based libraries like Cheerio or htmlparser2.21 It operates as a streaming parser, which is highly memory-efficient, especially for large HTML files. It allows for the use of CSS selectors to target and transform elements, making it easy to strip away tags and extract only the desired text content.19The implementation involves creating a rewriter that collects text from all elements while ignoring the tags themselves:TypeScriptexport async function parseHtml(file: BunFile): Promise<string> {
let fullText = '';
const rewriter = new HTMLRewriter().on('\*', {
text(chunk) {
// Append the text content of any element to our result string
fullText += chunk.text;
if (!chunk.lastInTextNode) {
fullText += ' '; // Add space between text chunks if they are not contiguous
}
},
});

const response = new Response(file);
// Transform the response stream using the rewriter
await rewriter.transform(response).text();
return fullText.replace(/\s+/g, ' ').trim(); // Clean up whitespace
}
Plain Text Parsing:Parsing plain text files is the most direct case. Bun's native and highly optimized file reading capabilities are the ideal tool for this. The BunFile object, which conforms to the Blob interface, provides a simple .text() method to read the entire file content into a string asynchronously.16TypeScriptexport async function parseTxt(file: BunFile): Promise<string> {
return await file.text();
}
By implementing these three distinct, optimized parsers and wrapping them in a dispatcher function that selects the correct parser based on the file's type property (e.g., application/pdf), the system can handle a variety of document formats in a robust and performant manner. This approach underscores a critical principle of RAG system design: the quality of the final output is directly proportional to the quality of the initial parsing. Investing in high-quality, format-specific parsing prevents the "garbage in, garbage out" problem, where malformed text from the parsing stage pollutes the entire downstream pipeline, leading to meaningless embeddings and irrelevant search results.242.3. The Art of Text Chunking for Optimal RetrievalAfter parsing, the raw text of a document must be segmented into smaller pieces, or "chunks." This is arguably the most critical step in the entire ingestion pipeline for determining the ultimate performance of the RAG system. There are two primary reasons for chunking: first, embedding models have a finite context window, and attempting to embed an entire large document will fail 25; second, and more importantly, retrieval is more precise when performed on small, semantically focused chunks of text rather than on large, general documents.26 The choice of chunking strategy directly impacts the semantic coherence of the resulting vector representations.Several strategies exist, each with its own trade-offs:Character/Fixed-Length Splitting: This is the most naive approach, simply slicing the text every X characters. While simple to implement, it is highly discouraged as it frequently breaks words and sentences mid-thought, destroying the semantic meaning of the resulting chunks and severely harming retrieval quality.27Recursive Character Splitting: This is a much more intelligent and widely recommended strategy for generic text. It attempts to split the text along a prioritized list of separators, such as double newlines (paragraphs), single newlines, spaces, and finally, characters. It tries to keep semantically related blocks of text (like paragraphs) together as much as possible before resorting to less ideal splits.12 The RecursiveCharacterTextSplitter from the @langchain/textsplitters library is a robust, battle-tested implementation of this strategy.27Structure-Aware Splitting: For documents with inherent structure, such as HTML or Markdown, this is the superior approach. Instead of relying on character patterns, it uses the document's structural elements (e.g., HTML tags, Markdown headers) as boundaries for splitting.26 This ensures that the resulting chunks align with the logical sections of the document, preserving their context and coherence. For example, splitting a Markdown document by its headers (#, ##) creates chunks that correspond to the document's sections and subsections, which is ideal for retrieval.25 Frameworks like LangChain.js and LlamaIndex.TS provide specialized splitters for these formats.28Semantic Splitting: This is the most advanced and computationally intensive method. It involves generating embeddings for sentences or small groups of sentences and then identifying "semantic break points" where the cosine similarity between adjacent sentence embeddings drops significantly. This allows the text to be chunked based on shifts in topic or meaning, rather than on structure or character count.26 While powerful, the added complexity and cost may not be necessary for many standard documentation use cases.For the MCP, a hybrid strategy is recommended. The system should use a Structure-Aware splitter for HTML inputs to leverage their inherent document structure. For the unstructured text extracted from PDFs and plain text files, the Recursive Character Splitter is the most appropriate and effective choice. This hybrid approach ensures that the best possible chunking strategy is applied based on the nature of the source document.The following table provides a comparative analysis to guide this strategic choice.StrategyDescriptionProsConsRecommended Use Case & LibraryFixed-LengthSplits text into chunks of a fixed character or token count.Simple to implement; predictable chunk size.Often breaks words and semantic units, leading to poor context and retrieval quality.Not recommended for production RAG systems.Recursive CharacterAttempts to split text on a prioritized list of separators (e.g., paragraphs, sentences, words).Balances simplicity and semantic coherence; good general-purpose strategy.May still split sentences if paragraphs are too long; less precise than structure-aware methods.Unstructured text from PDFs and TXT files. (@langchain/textsplitters) 12Structure-AwareSplits text based on document structure, such as Markdown headers or HTML tags.Preserves the logical and hierarchical context of the document, creating highly coherent chunks.Only applicable to structured document formats (HTML, Markdown, Code).HTML documents. (Custom logic with HTMLRewriter or libraries like LangChain/LlamaIndex) 25SemanticUses embedding models to identify semantic shifts in the text and splits at those points.Creates the most semantically coherent chunks, independent of length or structure.Computationally expensive; adds latency and cost to the ingestion pipeline.Complex, dense, and unstructured narratives where topical shifts are not marked by structure. 26The implementation will leverage the @langchain/textsplitters package for its robust RecursiveCharacterTextSplitter.TypeScriptimport { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export async function chunkText(text: string): Promise<string> {
const splitter = new RecursiveCharacterTextSplitter({
chunkSize: 1000, // The maximum size of a chunk in characters
chunkOverlap: 200, // The number of characters to overlap between chunks
});

const chunks = await splitter.splitText(text);
return chunks;
}
2.4. Generating Semantic EmbeddingsThe final step in the ingestion pipeline is to convert each text chunk into a numerical vector, or embedding. This vector is a high-dimensional representation that captures the semantic meaning of the text, allowing for similarity comparisons. The choice of embedding model is critical, as it determines the quality of the semantic representations.Two primary sources for embedding models are considered:OpenAI: OpenAI provides state-of-the-art, proprietary embedding models that are accessible via a simple API call. Models like text-embedding-3-small and text-embedding-3-large offer excellent performance and are very easy to integrate using the official openai TypeScript library.31 A significant advantage of OpenAI's latest models is the ability to specify the output dimensions of the embedding vector. This allows for a trade-off between performance, cost, and compatibility with vector databases that may have dimensional limitations, without a catastrophic loss in concept-representing properties.31Hugging Face: Hugging Face is a hub for a vast collection of open-source models. Using these models provides greater control, can be more cost-effective for very large-scale applications, and allows for local, offline execution. Integration can be achieved via the Hugging Face Inference API or by running models locally using libraries like @huggingface/transformers.33 Frameworks like LangChain.js and LlamaIndex.TS provide convenient wrappers for many popular Hugging Face embedding models.34For the MCP, the recommendation is to begin with OpenAI's text-embedding-3-small model. It offers a superb balance of performance, cost, and ease of implementation, making it an ideal choice for getting the system up and running with high-quality embeddings. The architectural design, particularly if leveraging an abstraction framework like LangChain.js, should allow for this model to be easily swapped with another (e.g., a self-hosted Hugging Face model) in the future if cost or data privacy requirements change.The implementation involves instantiating the OpenAI client and calling the embeddings.create method with the array of text chunks.TypeScriptimport OpenAI from 'openai';

const openai = new OpenAI({
apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmbeddings(chunks: string): Promise<number> {
if (!chunks |

| chunks.length === 0) {
return;
}

const response = await openai.embeddings.create({
model: 'text-embedding-3-small',
input: chunks,
});

// The response contains an array of embedding objects. We extract the vector from each.
return response.data.map((embeddingObject) => embeddingObject.embedding);
}
With this step complete, the ingestion pipeline has successfully transformed a raw document into a set of text chunks and their corresponding semantic vector embeddings, ready for storage and retrieval.Section 3: Vector Storage: The Heart of the RAG SystemThe vector database serves as the long-term memory of the RAG system. Its role is to efficiently store, index, and retrieve the high-dimensional embedding vectors generated during the ingestion pipeline. The choice of this component is critical, as its capabilities must align with the core functional requirements of the MCP. Specifically, the database must not only perform rapid semantic similarity searches but must also provide robust support for metadata filtering to enable the crucial logic of isolating queries to a specific documentationSetId.363.1. Vector Database Selection: Prioritizing Metadata FilteringThe primary requirement for the MCP's vector store is the ability to perform a "scoped" search—that is, to search for similar vectors only within a predefined subset of the data, identified by the documentationSetId. This makes the database's metadata filtering capabilities a first-order concern, arguably more important than raw search speed for this multi-tenant architecture.An analysis of the leading contenders reveals key differences:ChromaDB: Chroma is an open-source vector database designed specifically for AI applications.37 It can be run locally for development, self-hosted in production, or used as a managed cloud service, offering significant flexibility.38 Its most compelling feature for the MCP is its rich and expressive metadata filtering syntax. The Chroma client supports a variety of operators, including equality ($eq), logical operators ($and, $or), and inclusion operators ($in, $nin), which allow for the construction of complex and precise filters.39 It provides a full-featured, well-documented JavaScript/TypeScript client, making integration straightforward.37Pinecone: Pinecone is a popular, high-performance, fully-managed vector database service.42 It is known for its scalability and ease of use in production environments. It also offers a mature TypeScript SDK and supports metadata filtering, allowing for queries to be constrained based on metadata fields.44 While powerful, the filtering syntax presented in the available documentation appears more focused on direct equality matches, potentially offering less expressive power for complex queries compared to Chroma's operator-based system.Other Options: Other databases like Weaviate, or extensions like pgvector for PostgreSQL, are also viable.36 However, ChromaDB and Pinecone stand out due to their strong focus on the developer experience for AI applications and their dedicated, feature-rich TypeScript clients as highlighted in the research.For this project, ChromaDB is the recommended vector database. The primary reason for this recommendation is its superior and more expressive metadata filtering capabilities, which are a perfect architectural match for the MCP's core requirement of scoped retrieval.39 The ability to construct complex queries with logical operators provides not only a solution for the immediate documentationSetId requirement but also a flexible foundation for future features that might involve more sophisticated filtering (e.g., filtering by source file, date, or other metadata tags).Furthermore, Chroma's open-source nature presents a significant operational advantage. The ability to run a full-featured instance of the database locally during development drastically accelerates the iterative cycle of testing different chunking and embedding strategies without incurring cloud costs or network latency.37 This "develop locally, deploy to the cloud" workflow, where the same API is used in both environments, reduces friction and cost, making it an ideal choice for a new project.38The following table summarizes the comparison between the two leading candidates based on the project's specific needs.FeatureChromaDBPineconeAnalysis for MCP ProjectMetadata FilteringHighly expressive; supports logical ($and, $or) and comparison ($gt, $in) operators for complex queries.Supported; allows for filtering on metadata fields, primarily shown with equality checks.Chroma's advanced filtering is a key differentiator, perfectly aligning with the multi-tenant documentationSetId requirement and offering future flexibility. 39Deployment ModelFlexible; open-source for local development/self-hosting, with a fully-managed cloud option available.Fully-managed service only; simplifies operations but limits deployment flexibility and local development.Chroma's model is ideal for the project lifecycle, enabling cost-free local development and a smooth transition to a scalable cloud deployment. 37JS/TS Client SDKFull-featured, officially supported client for both Node.js and browser environments. Well-documented API.Mature and robust TypeScript SDK with strong type support for metadata.Both offer excellent client SDKs. The choice is not differentiated on this axis. 41Pricing ModelOpen-source is free. Cloud version offers serverless, usage-based billing.Tiered pricing based on pod size and resources. Can be more predictable but potentially more expensive at low usage.Chroma's open-source option eliminates development costs, and its serverless cloud pricing is well-suited for applications with variable traffic. 38ScalabilityDistributed architecture designed to scale horizontally, backed by object storage in its cloud offering.Proven scalability in large-scale production environments; a core value proposition of the managed service.Both platforms are designed for scale, but Chroma's architecture provides a clear path from a single local instance to a distributed cloud deployment. 383.2. Data Modeling for Scoped RetrievalA well-defined data model within the vector store is essential for enabling the required filtering logic. In this multi-tenant system, the metadata associated with each vector is not merely supplementary; it is a core component of the retrieval mechanism. Each record upserted into the ChromaDB collection must therefore contain a rich set of metadata to provide the necessary context.The schema for each record will consist of the following fields:id: A unique string identifier for each individual text chunk. A UUID is a suitable choice to ensure uniqueness across the entire collection.embedding: The numerical vector (an array of floating-point numbers) generated by the embedding model for the text chunk.document: The original string content of the text chunk. Storing this alongside the embedding allows the system to return the source text to the LLM without needing a separate lookup.metadata: A JSON object containing key-value pairs that describe the chunk's origin and context. This is the linchpin of the scoped retrieval strategy. The metadata object will contain at least the following fields:documentationSetId: A string representing the unique identifier of the documentation set to which this chunk belongs (e.g., "project-alpha-v1.2"). This is the primary field for filtering.sourceFileName: A string indicating the name of the original file from which the chunk was extracted (e.g., "api_guide.pdf"). This is useful for providing source attribution in the final response.chunkNumber: An integer representing the sequential position of the chunk within the original document. This can be useful for debugging or for more advanced retrieval strategies that consider chunk proximity.This data model ensures that every piece of vectorized knowledge is tagged with the necessary information to isolate it during a query, fulfilling the system's core multi-tenant requirement.3.3. Implementation: Storing Documents and Metadata with the ChromaDB ClientThis subsection provides the practical TypeScript code required to interact with ChromaDB, from initializing the client to storing the processed data from the ingestion pipeline.1. Installation:First, the ChromaDB client library must be added to the project using Bun's package manager.Bashbun add chromadb
The @chroma-core/default-embed package mentioned in some documentation is not needed here, as the MCP will be generating its own embeddings via the OpenAI API.372. Client Initialization:The ChromaClient is instantiated, configured to connect to the ChromaDB server instance. For local development, this will typically be http://localhost:8000. This URL should be managed via environment variables for production environments.TypeScriptimport { ChromaClient } from 'chromadb';

const chromaClient = new ChromaClient({
path: process.env.CHROMA_DB_URL |

| 'http://localhost:8000',
}); 3. Creating or Getting a Collection:A ChromaDB collection is analogous to a table in a relational database. It is a named container for embeddings and their associated data. The getOrCreateCollection method is used to ensure the collection exists without causing an error if it has already been created. A custom embedding function is not specified, as the embeddings will be generated beforehand and provided directly.TypeScriptconst collection = await chromaClient.getOrCreateCollection({
name: 'mcp_documentation',
// Optional: metadata can be added to the collection itself
// metadata: { "hnsw:space": "cosine" } // Example: specify distance metric
}); 4. Upserting Data:This is the final step of the ingestion pipeline, where the processed data is stored in the database. The collection.add() or collection.upsert() method is used for this purpose. upsert is often preferred as it will add new documents or update existing ones with the same ID. The method takes arrays of IDs, embeddings, documents (text content), and metadata. It is crucial that the indices of these arrays correspond to each other (e.g., ids, embeddings, documents, and metadatas all refer to the same chunk).The following function demonstrates how to take the output of the ingestion pipeline and store it in ChromaDB:TypeScriptimport { v4 as uuidv4 } from 'uuid';

// This function represents the culmination of the ingestion pipeline
export async function storeChunksInDb(
chunks: string,
embeddings: number,
documentationSetId: string,
sourceFileName: string
) {
if (chunks.length!== embeddings.length) {
throw new Error('Mismatch between number of chunks and embeddings.');
}

const ids = chunks.map(() => uuidv4());
const metadatas = chunks.map((\_, index) => ({
documentationSetId,
sourceFileName,
chunkNumber: index + 1,
}));

await collection.add({
ids,
embeddings,
documents: chunks,
metadatas,
});

console.log(`Successfully added ${chunks.length} chunks for doc set ${documentationSetId}`);
}
This implementation effectively translates the logical data model into a concrete database operation, ensuring that every vectorized chunk is correctly associated with its documentationSetId and other vital metadata, thereby setting the stage for precise, filtered retrieval.Section 4: The Query Engine: Answering Questions with ContextThe query engine is the user-facing component of the RAG pipeline, responsible for receiving a user's question, retrieving relevant context from the vector store, and orchestrating an LLM to generate a coherent and accurate answer. This section details the implementation of this engine, with a specific focus on the API design and the critical metadata-filtered retrieval logic that fulfills the core requirement of the MCP.4.1. Designing the Scoped Query API with ElysiaJSThe primary API endpoint for the MCP must be designed for clarity, robustness, and security. It will accept a user's query and the identifier for the specific documentation set they wish to query. ElysiaJS's declarative validation provides an excellent mechanism for defining and enforcing this API contract.The API contract is defined as follows:Endpoint: POST /api/v1/query/{documentationSetId}HTTP Method: POST is chosen as the query may contain sensitive information and to allow for a more complex request body than a GET request would permit.Path Parameter:documentationSetId (string): A required parameter that specifies which set of documents to search within.Request Body (JSON):query (string): The user's natural language question.topK (number, optional): The number of relevant chunks to retrieve from the database. Defaults to a sensible value like 5.The ElysiaJS implementation will define a route that captures this contract, using t.Object for the body schema and t.String for the path parameter. This ensures that any request not conforming to this structure is rejected with a 400 Bad Request error before the handler logic is even executed, providing a strong layer of type safety and input validation at the network boundary.14TypeScriptimport { Elysia, t } from 'elysia';
import { handleQuery } from './queryHandler'; // Logic will be in a separate module

const app = new Elysia()
.post(
'/api/v1/query/:documentationSetId',
async ({ params, body }) => {
const { documentationSetId } = params;
const { query, topK } = body;

      // Delegate the core logic to a dedicated handler function
      const response = await handleQuery(documentationSetId, query, topK);

      return response;
    },
    {
      // Validation schema for the request
      params: t.Object({
        documentationSetId: t.String({ minLength: 1 }),
      }),
      body: t.Object({
        query: t.String({ minLength: 1 }),
        topK: t.Optional(t.Numeric({ minimum: 1, maximum: 20, default: 5 })),
      }),
      response: t.Object({ // Define the shape of a successful response
        answer: t.String(),
        sources: t.Array(t.Object({
          sourceFileName: t.String(),
          chunkNumber: t.Number(),
        })),
      }),
    }

);

//... server setup...
4.2. Implementing Metadata-Filtered Vector SearchThis is the implementation of the core retrieval logic, where the system performs a semantic search that is strictly confined to a specific documentation set. The process is a two-stage operation: first, a logical filtering of the dataset based on metadata, and second, a semantic search within that filtered subset. This approach is highly efficient as it avoids performing computationally expensive vector similarity calculations on irrelevant data.The implementation steps are as follows:Extract Parameters: Inside the query handler, the documentationSetId, query, and topK values are extracted from the incoming request.Generate Query Embedding: The user's raw text query is sent to the same embedding model used during the ingestion phase (e.g., OpenAI's text-embedding-3-small). This ensures that the query vector and the document vectors exist in the same semantic space, which is a prerequisite for meaningful similarity comparison.Construct Metadata Filter: A where filter object is constructed for the ChromaDB query. This is the most critical step for enforcing the multi-tenant logic. The filter will specify that the metadata_field "documentationSetId" must be equal ($eq) to the value provided in the request's path parameter.39Execute Query: The collection.query() method from the ChromaDB client is invoked. It is passed the generated query embedding, the number of results to retrieve (n_results corresponding to topK), and the crucial where filter object.49The result of this operation will be a list of the most semantically similar document chunks that exclusively belong to the requested documentationSetId.TypeScript// Inside queryHandler.ts
import { collection } from './chromaClient'; // Assumes initialized ChromaDB collection
import { generateEmbeddings } from './embedding'; // The embedding generation function
import { generateAnswer } from './llm'; // The LLM response generation function

export async function handleQuery(documentationSetId: string, query: string, topK: number) {
// 1. Generate an embedding for the user's query
const queryEmbedding = (await generateEmbeddings([query]));

// 2. Construct the metadata filter
const whereFilter = {
"documentationSetId": {
"$eq": documentationSetId
}
};

// 3. Query ChromaDB with the embedding and the filter
const results = await collection.query({
queryEmbeddings: [queryEmbedding],
nResults: topK,
where: whereFilter,
include: ["documents", "metadatas"], // We need the text and metadata for the LLM
});

// 4. Extract the context and source information from the results
const context = results.documents.join('\n\n---\n\n');
const sources = results.metadatas.map(meta => ({
sourceFileName: meta.sourceFileName as string,
chunkNumber: meta.chunkNumber as number,
}));

// 5. Generate the final answer using the LLM
const answer = await generateAnswer(query, context);

return { answer, sources };
}
4.3. Prompt Engineering and Response GenerationThe document chunks retrieved from the vector database are not the final answer. They constitute the "context" that must be provided to a Large Language Model (LLM) to generate a high-quality, grounded response.25 The process of constructing the prompt for the LLM is a critical step known as prompt engineering.Prompt Construction:A well-designed prompt is essential for controlling the LLM's behavior and preventing it from "hallucinating" or providing answers based on its general pre-trained knowledge instead of the supplied documentation. The prompt must explicitly instruct the LLM on its task and constraints.A robust prompt structure includes:System Prompt/Instructions: A clear directive that defines the LLM's role and rules. A good practice is to instruct the model to rely exclusively on the provided context and to explicitly state when an answer cannot be found within that context.50Context Block: The retrieved document chunks are concatenated into a single string, clearly delineated under a heading like `.Question Block: The user's original query is appended, clearly marked under a heading like `.Example Prompt Template:System: You are an expert assistant for answering questions about technical documentation. Your task is to use ONLY the information provided in the section below to answer the user's. Do not use any of your prior knowledge. If the answer is not present in the context, you must state: "I could not find an answer in the provided documentation."

{context_string}

{user_query}
LLM Invocation:This structured prompt is then sent to a powerful LLM, such as OpenAI's GPT-4o, using the official openai client library.32 For a better user experience in a real-time application, the response from the LLM should be streamed back to the client.TypeScript// Inside llm.ts
import OpenAI from 'openai';

const openai = new OpenAI({
apiKey: process.env.OPENAI_API_KEY,
});

export async function generateAnswer(query: string, context: string): Promise<string> {
const systemPrompt = `You are an expert assistant... (as defined above)`;

const userMessage = `

${context}

${query}
`;

const response = await openai.chat.completions.create({
model: 'gpt-4o',
messages: [
{ role: 'system', content: systemPrompt },
{ role: 'user', content: userMessage },
],
temperature: 0.1, // Lower temperature for more factual, less creative answers
});

return response.choices.message.content |

| 'No response from model.';
}
This final step completes the RAG loop. By carefully filtering the search space and then grounding the LLM with a well-structured prompt, the query engine can provide accurate, relevant, and trustworthy answers that are strictly derived from the specified documentation set. This process highlights that the reliability of a RAG system is not just a function of the LLM's intelligence but is equally dependent on the precision of the retrieval step and the discipline enforced by the prompt.Section 5: System Integration and Operational ReadinessThe final section of this report focuses on assembling the individual components into a cohesive, runnable application and addressing the practical concerns of configuration, security, and deployment. This transforms the architectural blueprint into an operational system ready for production environments.5.1. The Complete Application Code (index.ts)This subsection presents the fully integrated source code for the MCP server. It combines the ElysiaJS web server setup, the initialization of external clients (ChromaDB and OpenAI), and the routing logic for both the ingestion and query endpoints. This unified view demonstrates how the modularized functions for parsing, chunking, embedding, storing, and querying work together within the framework of the application.The following is a complete, commented index.ts file that serves as the main entry point for the application. It assumes the logic for each stage of the pipeline has been organized into separate modules for clarity and maintainability.TypeScript// src/index.ts
import { Elysia, t } from 'elysia';
import { v4 as uuidv4 } from 'uuid';

// --- Module Imports ---
// These modules would contain the functions defined in previous sections.
import { initializeChroma, getMcpCollection } from './services/chromaClient';
import { initializeOpenAI } from './services/openaiClient';
import { parseDocument } from './processing/parser';
import { chunkText } from './processing/chunker';
import { generateEmbeddings } from './processing/embedding';
import { generateAnswer } from './llm/generation';

// --- Initialization ---
// Initialize clients at startup.
initializeOpenAI();
await initializeChroma();
const mcpCollection = await getMcpCollection();

// --- Main Application ---
const app = new Elysia()
.onError(({ code, error }) => {
console.error(`[${code}] Server error:`, error);
return new Response(error.toString(), { status: 500 });
})
// --- 1. Ingestion Endpoint ---
.post('/upload/:documentationSetId',
async ({ params, body, set }) => {
const { documentationSetId } = params;
const file = body.file as BunFile; // Assuming single file upload for simplicity

      try {
        console.log(` Starting ingestion for ${documentationSetId}, file: ${file.name}`);

        // Step 1: Parse document based on type
        const textContent = await parseDocument(file);
        console.log(` Parsed ${textContent.length} characters.`);

        // Step 2: Chunk the text
        const chunks = await chunkText(textContent);
        console.log(` Split into ${chunks.length} chunks.`);

        // Step 3: Generate embeddings for chunks
        const embeddings = await generateEmbeddings(chunks);
        console.log(` Generated ${embeddings.length} embeddings.`);

        // Step 4: Prepare data for ChromaDB
        const ids = chunks.map(() => uuidv4());
        const metadatas = chunks.map((_, index) => ({
          documentationSetId,
          sourceFileName: file.name |

| 'unknown',
chunkNumber: index + 1,
}));

        // Step 5: Upsert into ChromaDB
        await mcpCollection.upsert({ ids, embeddings, documents: chunks, metadatas });
        console.log(` Successfully stored chunks in vector DB.`);

        set.status = 202;
        return { message: `File '${file.name}' successfully processed for documentation set '${documentationSetId}'.` };
      } catch (e) {
        console.error(` Failed to process file for ${documentationSetId}:`, e);
        set.status = 500;
        return { error: 'An internal error occurred during document processing.' };
      }
    },
    {
      params: t.Object({ documentationSetId: t.String({ minLength: 1 }) }),
      body: t.Object({ file: t.File() }),
    }

)
// --- 2. Query Endpoint ---
.post('/query/:documentationSetId',
async ({ params, body }) => {
const { documentationSetId } = params;
const { query, topK } = body;

      try {
        console.log(` Received query for ${documentationSetId}: "${query}"`);

        // Step 1: Generate query embedding
        const queryEmbedding = (await generateEmbeddings([query]));

        // Step 2: Query vector DB with metadata filter
        const results = await mcpCollection.query({
          queryEmbeddings: [queryEmbedding],
          nResults: topK,
          where: { "documentationSetId": { "$eq": documentationSetId } },
          include: ["documents", "metadatas"],
        });
        console.log(` Retrieved ${results.ids.length} relevant chunks.`);

        // Step 3: Format context and generate answer
        const context = results.documents.join('\n\n---\n\n');
        const sources = results.metadatas.map(meta => ({
          sourceFileName: meta?.sourceFileName as string,
          chunkNumber: meta?.chunkNumber as number,
        }));

        const answer = await generateAnswer(query, context);
        console.log(` Generated answer.`);

        return { answer, sources };
      } catch (e) {
        console.error(` Failed to handle query for ${documentationSetId}:`, e);
        return { error: 'An internal error occurred while generating the answer.' };
      }
    },
    {
      params: t.Object({ documentationSetId: t.String({ minLength: 1 }) }),
      body: t.Object({
        query: t.String({ minLength: 1 }),
        topK: t.Optional(t.Numeric({ minimum: 1, maximum: 20, default: 5 })),
      }),
    }

)
.listen(3000);

console.log(
`🦊 MCP Server is running at ${app.server?.hostname}:${app.server?.port}`
);
5.2. Configuration and Security Best PracticesA production-ready application must never hard-code sensitive information or configuration variables directly in the source code. Best practices dictate the use of environment variables to manage these values, allowing the same application artifact to be deployed across different environments (development, staging, production) with different configurations.Configuration Management:A .env file should be used in the root of the project for local development. This file will store all necessary configuration and secret keys.42Bun has built-in support for automatically loading .env files, making the dotenv package unnecessary. The variables defined in .env will be available on the process.env object.Example .env file:#.env

# OpenAI API Key

OPENAI_API_KEY="sk-..."

# ChromaDB Connection URL

CHROMA_DB_URL="http://localhost:8000"

# Server Configuration

PORT=3000
Security Principles:The .env file must be added to the project's .gitignore file to prevent it from ever being committed to version control. This is a critical security measure to avoid exposing secret keys.In production environments (e.g., Docker containers, cloud virtual machines), these variables should be injected directly into the environment by the deployment platform or orchestration system (e.g., Kubernetes Secrets, Docker environment flags, CI/CD pipeline variables). This ensures that secrets are managed securely and are not stored on disk within the application's source code.5.3. Deployment PathwaysOnce the application is developed, it needs to be packaged and deployed to a production environment. The choice of Bun as the runtime simplifies this process significantly.Containerization with Docker:The most common and portable method for deploying modern web applications is containerization with Docker. A Dockerfile defines the steps to create a self-contained, runnable image of the application. Bun's all-in-one nature simplifies the Dockerfile compared to a traditional Node.js project, as a separate TypeScript compilation step is not required.2A sample Dockerfile for the Bun application:Code snippet# Use the official Bun image as a base
FROM oven/bun:1.0

# Set the working directory inside the container

WORKDIR /usr/src/app

# Copy package.json, bun.lockb to leverage Docker cache

COPY package.json bun.lockb./

# Install dependencies. Bun's installer is extremely fast.

# --frozen-lockfile ensures we install exactly what's in the lockfile.

RUN bun install --frozen-lockfile

# Copy the rest of the application source code

COPY..

# Expose the port the app runs on

EXPOSE 3000

# The command to run the application

# Bun can run the TypeScript source file directly in production.

CMD ["bun", "run", "src/index.ts"]
This Dockerfile is lean and efficient. It leverages Docker's layer caching for dependencies and uses Bun's ability to run TypeScript files directly, resulting in a simpler build process and potentially faster container startup times.Production Build:For environments where maximum performance is critical, bun build can be used to create a single, optimized JavaScript bundle.53 This command transpiles, tree-shakes, and bundles the entire application into an output directory. The target can be set to "bun", which adds a special pragma (// @bun) to the output file, signaling to the Bun runtime that the file is already transpiled and can be executed even faster.53The Dockerfile could be modified to use this build step:Code snippet#... (previous steps remain the same)

# Build the application

RUN bun build./src/index.ts --outdir./build --target bun

# Expose the port

EXPOSE 3000

# Run the bundled output

CMD ["bun", "run", "./build/index.js"]
Running as a Service:On a traditional virtual machine or bare-metal server, the Bun process should be managed by a process manager to ensure it runs persistently and is automatically restarted in case of a crash. Tools like PM2 or a systemd service file are standard solutions for this purpose.2 This ensures the MCP API remains available and resilient.Conclusion: Summary and Future EnhancementsThis report has detailed the complete architectural design and implementation of a high-performance, multi-tenant Documentation Management and Querying System (MCP) using Bun and TypeScript. The architectural choices were deliberately made to prioritize performance, developer experience, and, most critically, the core functional requirement of scoped, multi-tenant data retrieval.The selection of the Bun runtime and the ElysiaJS framework establishes a highly synergistic foundation, where Bun's speed and native TypeScript support are fully leveraged by Elysia's Bun-specific optimizations and best-in-class type safety. The ingestion pipeline was designed with a focus on quality, employing format-specific parsers (unpdf, HTMLRewriter) and a hybrid text chunking strategy to prevent the "garbage in, garbage out" problem that plagues many RAG systems. For vector storage, ChromaDB was chosen for its flexible deployment model and, most importantly, its expressive metadata filtering capabilities, which are essential for the system's multi-tenant architecture. Finally, the query engine implements an efficient two-stage retrieval process—filtering by documentationSetId before performing a semantic search—and utilizes robust prompt engineering to ground the LLM's responses firmly in the retrieved context, ensuring accuracy and reliability.The resulting system is a powerful and scalable platform for managing and querying distinct sets of documentation. However, the field of generative AI is rapidly evolving, and several avenues for future enhancement exist:Advanced Retrieval Strategies: The current implementation uses a standard vector similarity search. Performance could be further improved by incorporating more advanced techniques. This includes hybrid search, which combines the semantic relevance of vector search with the keyword precision of full-text search, and the addition of a re-ranking step. A re-ranker, such as the CohereRerank model, can take the top k results from the initial vector search and re-order them based on a more sophisticated cross-encoder model, significantly improving the relevance of the final context provided to the LLM.42Agentic Capabilities: The current system requires the user to specify the documentationSetId. A more advanced version could employ an AI agent. This agent would first analyze the user's query to determine the intent and then intelligently decide which documentation set (or sets) is most likely to contain the answer, before initiating the RAG pipeline.52 This would transform the system from a scoped search tool into a more powerful, autonomous knowledge worker.Enhanced User Interface: While this report focuses on the backend API, a complete system would benefit from a web-based user interface. This UI could provide a dashboard for uploading and managing documentation sets, a chat interface for querying, and visualizations for exploring the knowledge base.Observability and Evaluation: As the system scales, it will become crucial to monitor its performance and accuracy. Integrating a tool like LangSmith would provide detailed tracing and observability into every step of the RAG chain.12 This allows for debugging complex interactions, evaluating the effectiveness of different prompts or chunking strategies, and monitoring for performance degradation or a drop in answer quality over time.56By building upon the robust and scalable foundation outlined in this report, the MCP can evolve to incorporate these advanced features, solidifying its position as a state-of-the-art solution for intelligent documentation management and retrieval.
