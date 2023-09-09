
import path from 'path';
import webpack from 'webpack';
import { objectToString } from '@upradata/util';
import { red, yellow } from '@upradata/node-util';
import { WebpackConfigOptions, webpackConfig } from './config';


export const compileDone = async (err: Error, stats: webpack.Stats): Promise<WebpackOutputAsset[]> => {

    const displayError = (err?: Error | webpack.StatsError) => {
        if (err) {
            console.error(red`${err.message || 'Error encountered:'}`);
            console.error(err.stack);
            console.error((err as webpack.StatsError).details || err);
        }
    };

    if (err) {
        displayError(err);
        return [];
    }

    // Look here to see the options webpack/lib/stats/DefaultStatsPresetPlugin.js
    console.log(stats.toString({  /* preset: 'minimal''detailed', */ colors: true }));

    const info = stats.toJson();

    if (stats.hasErrors()) {
        info.errors?.forEach(displayError);
        return [];
    }

    if (stats.hasWarnings())
        console.warn(yellow`${objectToString(info.warnings)}`);


    const { outputPath } = stats.compilation.compiler;

    return Object.keys(stats.compilation.assets).map(assetName => {
        const filename = assetName.split('?')[ 0 ];
        const outputDir = outputPath;
        const filepath = path.join(outputPath, filename);

        return { filename, outputDir, filepath };
    });
};


export type WebpackOutputAsset = { filename: string; outputDir: string; filepath: string; };


export type WebpackCompileOptions = WebpackConfigOptions & {
    filesystems?: {
        input?: webpack.Compiler[ 'inputFileSystem' ];
        intermediate?: webpack.Compiler[ 'intermediateFileSystem' ];
        output?: webpack.Compiler[ 'outputFileSystem' ];
    };
};


export type WebpackCompileReturn = {
    files: WebpackOutputAsset[];
    filesystems: WebpackCompileOptions[ 'filesystems' ];
};

export const webpackCompile = async (options: WebpackCompileOptions): Promise<WebpackCompileReturn> => {
    const { filesystems: { input, intermediate, output }, ...webpackOptions } = options;

    const compiler = webpack(webpackConfig(webpackOptions));


    if (input)
        compiler.inputFileSystem = input;

    if (intermediate)
        compiler.intermediateFileSystem = intermediate;

    if (output)
        compiler.outputFileSystem = output;


    return new Promise<WebpackCompileReturn>(res => {
        const done = (err: Error, stats: webpack.Stats) => compileDone(err, stats).then(files => res({
            files: files.sort((f1, f2) => {
                if (f1.filename.startsWith('vendor'))
                    return -1; // f1 is before f2

                if (f2.filename.startsWith('vendor'))
                    return 1; // f2 is before f1

                if (f1.filename.startsWith('main'))
                    return 1; // f1 is after f2

                if (f2.filename.endsWith('main'))
                    return -1;  // f1 is before f2
            }),
            filesystems: {
                input: compiler.inputFileSystem,
                intermediate: compiler.intermediateFileSystem,
                output: compiler.outputFileSystem
            }
        }));

        if (options.watch)
            compiler.watch({ aggregateTimeout: 100 }, done);
        else
            compiler.run(done);
    });
};
